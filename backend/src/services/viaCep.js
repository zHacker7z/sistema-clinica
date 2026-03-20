const axios = require('axios');

function normalizeCep(cep) {
  return String(cep).replace(/\D/g, '');
}

async function fetchAddressByCep(cep) {
  const normalized = normalizeCep(cep);
  if (!normalized || normalized.length !== 8) {
    const err = new Error('CEP inválido. Use 8 dígitos.');
    err.statusCode = 400;
    throw err;
  }

  const url = `https://viacep.com.br/ws/${normalized}/json/`;
  const { data } = await axios.get(url, { timeout: 10000 });

  if (!data || data.erro) {
    const err = new Error('CEP não encontrado.');
    err.statusCode = 404;
    throw err;
  }

  return {
    cep: normalized,
    logradouro: data.logradouro || '',
    bairro: data.bairro || '',
    localidade: data.localidade || '',
    uf: data.uf || '',
  };
}

module.exports = { fetchAddressByCep };

