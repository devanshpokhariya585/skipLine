const app = require('./app');
const config = require('./config/env');
const { connectDB } = require('./config/db');

(async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('\nCould not connect to MongoDB.');
    console.error('Check that mongod is running and MONGO_URI is correct in .env');
    console.error(`Current MONGO_URI: ${config.mongoUri}\n`);
    console.error(err.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`\n${config.messName} API running on http://localhost:${config.port}`);
    console.log(`Monthly allowance: ${config.monthlyAllowance}  |  Daily limit: ${config.dailyLimit}\n`);
  });
})();
