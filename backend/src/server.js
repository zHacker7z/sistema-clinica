require('dotenv').config();

const { env } = require('./config/env');
const { connectMongo } = require('./config/mongo');
const { createApp } = require('./app');

async function main() {
  await connectMongo();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`API running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

