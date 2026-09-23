const { Schema, model } = require('mongoose');

const CATEGORIES = ['Starter', 'Main Course', 'South Indian', 'Snacks', 'Beverages', 'Dessert'];

const foodSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, default: 'Main Course' },
    price: { type: Number, required: true, min: 0 },
    veg: { type: Boolean, default: true },
    description: { type: String, trim: true, default: '' },
    available: { type: Boolean, default: true },
    // Optional image URL. When empty the frontend shows a lettered tile.
    image: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

foodSchema.statics.CATEGORIES = CATEGORIES;

module.exports = model('FoodItem', foodSchema);
