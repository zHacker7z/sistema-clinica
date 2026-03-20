const express = require('express');
const { fetchAddressByCep } = require('../services/viaCep');

const router = express.Router();

router.get('/cep/:cep', async (req, res, next) => {
  try {
    const { cep } = req.params;
    const address = await fetchAddressByCep(cep);
    return res.json({ ok: true, address });
  } catch (err) {
    err.statusCode = err.statusCode || 500;
    return res.status(err.statusCode).json({ ok: false, error: err.message || 'Erro no CEP' });
  }
});

module.exports = router;

