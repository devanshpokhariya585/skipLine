const express = require('express');
const FoodItem = require('../models/FoodItem');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const User = require('../models/User');
const config = require('../config/env');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { spentToday, walletSnapshot, ensureMonthlyAllocation } = require('../utils/wallet');

const router = express.Router();

const STATUS_FIELD = {
  placed: 'placedAt',
  preparing: 'preparingAt',
  ready: 'readyAt',
  collected: 'collectedAt',
  cancelled: 'cancelledAt',
};

// The order a status can advance to.
const NEXT = { placed: 'preparing', preparing: 'ready', ready: 'collected' };

//  Student: place an order --
router.post(
  '/',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const student = req.user;
    await ensureMonthlyAllocation(student);

    const requested = Array.isArray(req.body.items) ? req.body.items : [];
    if (!requested.length) {
      return res.status(400).json({ error: 'Your cart is empty' });
    }

    // Re-price from the database so the client can't set its own prices.
    const ids = requested.map((i) => i.food);
    const foods = await FoodItem.find({ _id: { $in: ids } });
    const foodMap = new Map(foods.map((f) => [f._id.toString(), f]));

    const items = [];
    for (const line of requested) {
      const food = foodMap.get(String(line.food));
      const qty = Math.max(1, parseInt(line.qty, 10) || 0);
      if (!food) return res.status(400).json({ error: 'An item is no longer on the menu' });
      if (!food.available) {
        return res.status(400).json({ error: `${food.name} is currently unavailable` });
      }
      items.push({ food: food._id, name: food.name, price: food.price, qty });
    }

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    // Wallet balance check
    if (total > student.points.balance) {
      return res.status(400).json({
        error: `Not enough points. Balance ${student.points.balance}, order ${total}.`,
      });
    }

    // Daily spend cap
    const already = await spentToday(student._id);
    if (already + total > config.dailyLimit) {
      const left = Math.max(0, config.dailyLimit - already);
      return res.status(400).json({
        error: `Daily limit is ${config.dailyLimit}. You have ${left} left for today.`,
      });
    }

    const orderNo = await Counter.next('order');
    const order = await Order.create({
      orderNo,
      student: student._id,
      studentName: student.name,
      block: student.block || '',
      items,
      total,
      note: String(req.body.note || ''),
      status: 'placed',
      timeline: { placedAt: new Date() },
    });

    // Debit the wallet.
    student.points.balance -= total;
    await student.save();

    res.status(201).json({
      order,
      wallet: await walletSnapshot(student),
    });
  })
);

//  Student: my orders 
router.get(
  '/mine',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ student: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ orders });
  })
);

//  Kitchen / admin: active + all orders -
router.get(
  '/',
  requireAuth,
  requireRole('chef', 'admin'),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.active === 'true') {
      filter.status = { $in: ['placed', 'preparing', 'ready'] };
    }
    const orders = await Order.find(filter).sort({ createdAt: 1 }).limit(200);
    res.json({ orders });
  })
);

//  Kitchen / admin: advance or set status 
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('chef', 'admin'),
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // If a target status is given use it, otherwise advance one step.
    let target = req.body.status;
    if (!target) target = NEXT[order.status];
    if (!target || !Order.STATUSES.includes(target)) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    // Cancelling refunds the student's points.
    if (target === 'cancelled' && order.status !== 'cancelled') {
      const student = await User.findById(order.student);
      if (student) {
        student.points.balance += order.total;
        await student.save();
      }
    }

    order.status = target;
    order.timeline[STATUS_FIELD[target]] = new Date();
    await order.save();
    res.json({ order });
  })
);

module.exports = router;
