// Centraliza erros de forma consistente (sem stack em produção).
function errorHandler(err, req, res, _next) {
  const status = err.statusCode || 500;
  const message =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message || 'Unexpected error';

  res.status(status).json({
    ok: false,
    error: message,
  });
}

module.exports = { errorHandler };

