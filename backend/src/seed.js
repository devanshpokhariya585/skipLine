/**
 * Seeds the database with:
 *   - one admin (mess owner) from .env  -> ADMIN_LOGIN / ADMIN_PASSWORD
 *   - one demo chef and one demo student (handy for a first run)
 *   - a sample menu
 *
 * Run:  npm run seed
 * Existing records with the same loginId / item name are left untouched.
 */
const mongoose = require('mongoose');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const User = require('./models/User');
const FoodItem = require('./models/FoodItem');
const VerificationCode = require('./models/VerificationCode');
const { currentPeriod } = require('./utils/wallet');

const MENU = [
  { name: 'Chicken Fried Rice', category: 'Main Course', price: 120, veg: false, description: 'Wok-fried rice with chicken, vegetables and egg.' },
  { name: 'Paneer Fried Rice', category: 'Main Course', price: 110, veg: true, description: 'Fried rice with soft paneer and vegetables.' },
  { name: 'Veg Noodles', category: 'Main Course', price: 90, veg: true, description: 'Stir-fried noodles with fresh vegetables.' },
  { name: 'Chicken Noodles', category: 'Main Course', price: 110, veg: false, description: 'Classic noodles with chicken and vegetables.' },
  { name: 'Masala Dosa', category: 'South Indian', price: 70, veg: true, description: 'Crisp dosa served with chutney and sambar.' },
  { name: 'Idli Vada', category: 'South Indian', price: 55, veg: true, description: 'Steamed idli and crisp vada with sambar.' },
  { name: 'Egg Roll', category: 'Snacks', price: 60, veg: false, description: 'Egg-filled roll with vegetables and sauces.' },
  { name: 'French Fries', category: 'Snacks', price: 55, veg: true, description: 'Crisp golden fries with seasoning.' },
  { name: 'Cold Coffee', category: 'Beverages', price: 65, veg: true, description: 'Chilled creamy coffee.' },
  { name: 'Masala Chai', category: 'Beverages', price: 25, veg: true, description: 'Spiced Indian tea.' },
];

async function upsertUser({ loginId, name, email, role, password, extra = {} }) {
  const existing = await User.findOne({ loginId });
  if (existing) {
    console.log(`  = ${role} "${loginId}" already exists, skipped`);
    return;
  }
  const user = new User({ loginId, name, email, role, ...extra });
  await user.setPassword(password);
  await user.save();
  console.log(`  + ${role} "${loginId}" created  (password: ${password})`);
}

(async () => {
  await connectDB();

  console.log('\nSeeding users...');
  await upsertUser({
    loginId: config.admin.login,
    name: config.admin.name,
    email: config.admin.email,
    role: 'admin',
    password: config.admin.password,
  });

  await upsertUser({
    loginId: 'chef1',
    name: 'Kitchen Staff',
    email: 'chef@srccdx.local',
    role: 'chef',
    password: 'chef@123',
    extra: { mustResetPassword: true },
  });

  await upsertUser({
    loginId: '24bca0005',
    name: 'Demo Student',
    email: 'student@srccdx.local',
    role: 'student',
    password: 'student@123',
    extra: {
      block: 'B Block',
      phone: '9876543210',
      mustResetPassword: true,
      points: {
        monthlyAllowance: config.monthlyAllowance,
        balance: config.monthlyAllowance,
        lastAllocated: currentPeriod(),
      },
    },
  });

  console.log('\nSeeding menu...');
  for (const item of MENU) {
    const exists = await FoodItem.findOne({ name: item.name });
    if (exists) {
      console.log(`  = "${item.name}" already exists, skipped`);
    } else {
      await FoodItem.create(item);
      console.log(`  + "${item.name}"`);
    }
  }

  console.log('\nSeeding verification codes...');
  const codeCount = await VerificationCode.countDocuments();
  if (codeCount === 0) {
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const c = await VerificationCode.createUnique({});
      console.log(`  + registration code: ${c.code}`);
    }
  } else {
    console.log(`  = ${codeCount} code(s) already exist, skipped`);
  }

  console.log('\nDone.\n');
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
