const { resolveCoordinatesWithFallback, getWeatherSnapshotForDate } = require('./openMeteo');

async function getWeatherSnapshotByAddress({ address, dateISO }) {
  const localidade = address?.localidade;
  const uf = address?.uf;

  if (!localidade || !uf) {
    return {
      date: dateISO,
      status: 'unknown',
      precipitationProbabilityMax: null,
      lat: null,
      lon: null,
      source: 'open-meteo',
    };
  }

  const coords = await resolveCoordinatesWithFallback({
    localidade,
    uf,
    logradouro: address?.logradouro,
    cep: address?.cep,
  });

  if (!coords) {
    return {
      date: dateISO,
      status: 'unknown',
      precipitationProbabilityMax: null,
      lat: null,
      lon: null,
      source: 'open-meteo',
    };
  }

  const snapshot = await getWeatherSnapshotForDate({
    lat: coords.lat,
    lon: coords.lon,
    dateISO,
  });

  return { date: dateISO, ...snapshot, geocodingSource: coords.source };
}

module.exports = { getWeatherSnapshotByAddress };

