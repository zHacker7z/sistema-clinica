function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function splitOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 4000,
  MONGODB_URI: requiredEnv('MONGODB_URI'),
  JWT_SECRET: requiredEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGINS: splitOrigins(process.env.CORS_ORIGINS),
};

module.exports = { env };

