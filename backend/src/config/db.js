const mongoose = require('mongoose');
const config = require('./env');

mongoose.set('strictQuery', true);

async function connectDB() {
  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 8000,
  });
  const { host, name } = mongoose.connection;
  console.log(`MongoDB connected  ->  ${host}/${name}`);
  return mongoose.connection;
}

module.exports = { connectDB, mongoose };
