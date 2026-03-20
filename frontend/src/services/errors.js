export function extractErrorMessage(error, fallbackMessage = 'Ocorreu um erro inesperado.') {
  const apiMessage = error?.response?.data?.error;
  const message = apiMessage || error?.message || fallbackMessage;
  return String(message);
}

