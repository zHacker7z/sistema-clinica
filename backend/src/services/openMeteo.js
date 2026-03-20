const axios = require("axios");

const GEO_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_BASE_URL = "https://api.open-meteo.com/v1/forecast";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

// Cache simples em memória para reduzir chamadas por lista/painel.
const forecastCache = new Map(); // key -> { expiresAt, daily }
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

function normalizeNumber(n) {
  return Number(n);
}

async function resolveCoordinatesFromQuery({ name }) {
  if (!name || name.length < 2) return null;
  const url = `${GEO_BASE_URL}?name=${encodeURIComponent(name)}&count=1&language=pt&format=json&countryCode=BR`;
  const { data } = await axios.get(url, { timeout: 10000 });
  const first = Array.isArray(data?.results) ? data.results[0] : null;
  if (!first) return null;
  if (typeof first.latitude !== "number" || typeof first.longitude !== "number")
    return null;
  return {
    lat: normalizeNumber(first.latitude),
    lon: normalizeNumber(first.longitude),
  };
}

async function resolveCoordinatesFromNominatim({ query }) {
  if (!query || query.length < 2) return null;
  const url =
    `${NOMINATIM_BASE_URL}?q=${encodeURIComponent(query)}` +
    "&format=json&limit=1&countrycodes=br";

  const { data } = await axios.get(url, {
    timeout: 12000,
    headers: { "User-Agent": "ProjetoFullstack/1.0 (academic project)" },
  });
  const first = Array.isArray(data) ? data[0] : null;
  if (!first) return null;
  if (first.lat == null || first.lon == null) return null;
  return { lat: normalizeNumber(first.lat), lon: normalizeNumber(first.lon) };
}

async function getDailyPrecipitationForNextDays(lat, lon, modelName) {
  const latFixed = Number(lat).toFixed(4);
  const lonFixed = Number(lon).toFixed(4);
  const key = `${latFixed},${lonFixed},${modelName || "default"},daily`;

  const cached = forecastCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.daily;

  let url =
    `${FORECAST_BASE_URL}?latitude=${encodeURIComponent(latFixed)}` +
    `&longitude=${encodeURIComponent(lonFixed)}` +
    "&daily=precipitation_probability_max" +
    "&timezone=America%2FSao_Paulo&forecast_days=14";
  if (modelName) url += `&models=${encodeURIComponent(modelName)}`;

  const { data } = await axios.get(url, { timeout: 30000 });

  if (!data?.daily?.time) {
    throw new Error("Falha ao obter dados do clima (Open-Meteo).");
  }

  const daily = {
    time: data.daily.time,
    precipitationProbabilityMax: data.daily.precipitation_probability_max || [],
  };
  forecastCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, daily });
  return daily;
}

async function getHourlyPrecipitationForNextDays(lat, lon, modelName) {
  const latFixed = Number(lat).toFixed(4);
  const lonFixed = Number(lon).toFixed(4);
  const key = `${latFixed},${lonFixed},${modelName || "default"},hourly`;

  const cached = forecastCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.daily;

  let url =
    `${FORECAST_BASE_URL}?latitude=${encodeURIComponent(latFixed)}` +
    `&longitude=${encodeURIComponent(lonFixed)}` +
    "&hourly=precipitation_probability" +
    "&timezone=America%2FSao_Paulo&forecast_days=14";
  if (modelName) url += `&models=${encodeURIComponent(modelName)}`;

  const { data } = await axios.get(url, { timeout: 15000 });
  const time = Array.isArray(data?.hourly?.time) ? data.hourly.time : [];
  const pp = Array.isArray(data?.hourly?.precipitation_probability)
    ? data.hourly.precipitation_probability
    : [];

  const byDate = new Map();
  for (let i = 0; i < time.length; i += 1) {
    const t = String(time[i] || "");
    const day = t.slice(0, 10);
    const val = typeof pp[i] === "number" ? pp[i] : null;
    if (!day || val === null) continue;
    const prev = byDate.get(day);
    byDate.set(day, typeof prev === "number" ? Math.max(prev, val) : val);
  }

  const daily = { byDate };
  forecastCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, daily });
  return daily;
}

async function getWeatherSnapshotForDate({
  lat,
  lon,
  dateISO,
  rainThreshold = 50,
}) {
  const forecastModels = [null, "gfs_seamless"];

  for (const modelName of forecastModels) {
    try {
      const daily = await getDailyPrecipitationForNextDays(lat, lon, modelName);
      const timeArr = Array.isArray(daily.time) ? daily.time : [];
      const idx = timeArr.indexOf(dateISO);
      if (idx === -1) continue;

      const precipitationProbabilityMax =
        daily.precipitationProbabilityMax[idx];
      const probability =
        typeof precipitationProbabilityMax === "number"
          ? precipitationProbabilityMax
          : null;
      if (probability === null) continue;

      const status = probability >= rainThreshold ? "rain" : "clear";
      return {
        status,
        precipitationProbabilityMax: probability,
        lat,
        lon,
        source: modelName
          ? `open-meteo:${modelName}:daily`
          : "open-meteo:daily",
      };
    } catch {
      // tenta próxima estratégia
    }
  }

  // fallback 2: agregado do hourly precipitation_probability
  for (const modelName of forecastModels) {
    try {
      const hourly = await getHourlyPrecipitationForNextDays(
        lat,
        lon,
        modelName,
      );
      const probability = hourly.byDate.get(dateISO);
      if (typeof probability !== "number") continue;
      const status = probability >= rainThreshold ? "rain" : "clear";
      return {
        status,
        precipitationProbabilityMax: probability,
        lat,
        lon,
        source: modelName
          ? `open-meteo:${modelName}:hourly-aggregate`
          : "open-meteo:hourly-aggregate",
      };
    } catch {
      // tenta próxima estratégia
    }
  }

  return {
    status: "unknown",
    precipitationProbabilityMax: null,
    lat,
    lon,
    source: "weather-fallback:unknown",
  };
}

async function resolveCoordinatesWithFallback({
  localidade,
  uf,
  logradouro,
  cep,
}) {
  const queries = [
    `${localidade}, ${uf}, Brasil`,
    `${logradouro || ""}, ${localidade}, ${uf}, Brasil`.replace(/^,\s*/, ""),
    `${cep || ""}, ${localidade}, ${uf}, Brasil`.replace(/^,\s*/, ""),
  ].filter((q) => q && q.length >= 2);

  for (const q of queries) {
    try {
      const coords = await resolveCoordinatesFromQuery({ name: q });
      if (coords) return { ...coords, source: "open-meteo-geocoding" };
    } catch {
      // tenta próxima
    }
  }

  for (const q of queries) {
    try {
      const coords = await resolveCoordinatesFromNominatim({ query: q });
      if (coords) return { ...coords, source: "nominatim" };
    } catch {
      // tenta próxima
    }
  }

  return null;
}

module.exports = {
  getWeatherSnapshotForDate,
  resolveCoordinatesWithFallback,
};
