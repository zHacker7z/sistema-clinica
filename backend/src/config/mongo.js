const mongoose = require('mongoose');
const { env } = require('./env');

async function connectMongo() {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  await mongoose.connect(env.MONGODB_URI, {});
  console.log('MongoDB connected');
}

module.exports = { connectMongo };

