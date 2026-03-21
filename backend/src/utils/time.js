const SAO_PAULO_TZ = "America/Sao_Paulo";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getSaoPauloDateISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function parseSaoPauloLocalToDateUTC(dateISO, timeHHMM) {
  // Converte horário local de São Paulo (UTC-3) para UTC.
  // Para 10:00 local, deve ser 13:00 UTC.
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = timeHHMM.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute, 0));
}

module.exports = { getSaoPauloDateISO, parseSaoPauloLocalToDateUTC };
