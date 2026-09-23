require('dotenv').config();

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const config = {
  port: num(process.env.PORT, 4000),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_canteen',

  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpires: process.env.JWT_EXPIRES || '7d',

  messName: process.env.MESS_NAME || 'Smart Canteen',

  monthlyAllowance: num(process.env.MONTHLY_ALLOWANCE, 8000),
  dailyLimit: num(process.env.DAILY_LIMIT, 450),
  defaultStudentPassword: process.env.DEFAULT_STUDENT_PASSWORD || 'canteen@123',

  admin: {
    name: process.env.ADMIN_NAME || 'Mess Owner',
    login: process.env.ADMIN_LOGIN || 'admin',
    email: process.env.ADMIN_EMAIL || 'owner@example.local',
    password: process.env.ADMIN_PASSWORD || 'admin@123',
  },
};

module.exports = config;
