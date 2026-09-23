const Order = require('../models/Order');
const config = require('../config/env');

// "YYYY-MM" for the current month, in server local time.
function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function startOfToday(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

// Use-it-or-lose-it: if the student hasn't been topped up this calendar month,
// reset their balance to the monthly allowance. Runs lazily on activity.
async function ensureMonthlyAllocation(user) {
  if (user.role !== 'student') return user;
  const period = currentPeriod();
  const allowance = user.points.monthlyAllowance || config.monthlyAllowance;
  if (user.points.lastAllocated !== period) {
    user.points.monthlyAllowance = allowance;
    user.points.balance = allowance;
    user.points.lastAllocated = period;
    await user.save();
  }
  return user;
}

// Sum of what this student has already spent today (excludes cancelled orders).
async function spentToday(userId) {
  const rows = await Order.aggregate([
    {
      $match: {
        student: userId,
        status: { $ne: 'cancelled' },
        createdAt: { $gte: startOfToday() },
      },
    },
    { $group: { _id: null, total: { $sum: '$total' } } },
  ]);
  return rows.length ? rows[0].total : 0;
}

// Everything the wallet UI needs.
async function walletSnapshot(user) {
  const spent = await spentToday(user._id);
  const dailyLimit = config.dailyLimit;
  return {
    balance: user.points.balance,
    monthlyAllowance: user.points.monthlyAllowance || config.monthlyAllowance,
    period: user.points.lastAllocated || currentPeriod(),
    dailyLimit,
    spentToday: spent,
    dailyRemaining: Math.max(0, dailyLimit - spent),
  };
}

module.exports = {
  currentPeriod,
  startOfToday,
  ensureMonthlyAllocation,
  spentToday,
  walletSnapshot,
};
