const { Schema, model } = require('mongoose');

const STATUSES = ['placed', 'preparing', 'ready', 'collected', 'cancelled'];

const lineSchema = new Schema(
  {
    food: { type: Schema.Types.ObjectId, ref: 'FoodItem' },
    name: String,
    price: Number,
    qty: { type: Number, min: 1 },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    orderNo: { type: Number, required: true, unique: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: String,
    block: String,
    items: [lineSchema],
    total: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'placed', index: true },
    // Timestamps for each step, filled as the order progresses.
    timeline: {
      placedAt: Date,
      preparingAt: Date,
      readyAt: Date,
      collectedAt: Date,
      cancelledAt: Date,
    },
  },
  { timestamps: true }
);

orderSchema.statics.STATUSES = STATUSES;

module.exports = model('Order', orderSchema);
