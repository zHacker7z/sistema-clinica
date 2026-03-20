const SAO_PAULO_TZ = 'America/Sao_Paulo';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function getSaoPauloDateISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

function parseSaoPauloLocalToDateUTC(dateISO, timeHHMM) {
  // Para fins acadêmicos: Sao Paulo atualmente usa -03:00 (sem horário de verão).
  // Mantemos o offset explícito para evitar surpresas com o servidor.
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hour, minute] = timeHHMM.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0));
}

module.exports = { getSaoPauloDateISO, parseSaoPauloLocalToDateUTC };

