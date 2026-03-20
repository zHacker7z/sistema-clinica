export function formatCepInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function normalizeCep(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 8);
}

