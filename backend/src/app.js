const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { env } = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const addressRoutes = require('./routes/address.routes');
const appointmentsRoutes = require('./routes/appointments.routes');
const adminRoutes = require('./routes/admin.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(morgan('dev'));

  app.use(
    cors({
      origin: env.CORS_ORIGINS.length ? env.CORS_ORIGINS : undefined,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/address', addressRoutes);
  app.use('/api/appointments', appointmentsRoutes);
  app.use('/api/admin', adminRoutes);

  // Deve ser o último middleware.
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

