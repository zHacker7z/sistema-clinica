require("dotenv").config();

const { env } = require("./config/env");
const { connectMongo } = require("./config/mongo");
const { createApp } = require("./app");

console.log("MONGODB_URI:", process.env.MONGODB_URI ? "OK" : "NÃO DEFINIDO");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "OK" : "NÃO DEFINIDO");

process.on("uncaughtException", (err) => {
  console.error("ERRO NÃO TRATADO:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("PROMISE ERROR:", err);
});

async function main() {
  await connectMongo();
  const app = createApp();

  app.listen(env.PORT, () => {
    console.log(`API running on port ${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
