const express = require('express');
const FoodItem = require('../models/FoodItem');
const { requireAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { validateAll } = require('../utils/validate');

// Validate + clean a dish payload. Returns { values, errors, valid }.
function validateDish(b) {
  const { values, errors, valid } = validateAll({
    name: ['dishName', b.name],
    price: ['price', b.price],
    category: ['category', b.category],
    image: ['imageUrl', b.image],
    description: ['description', b.description],
  });
  // Diet + availability are booleans coming from radio buttons.
  values.veg = b.veg === true || b.veg === 'veg' || b.veg === 'true';
  values.available = !(b.available === false || b.available === 'no' || b.available === 'false');
  return { values, errors, valid };
}

const router = express.Router();

// Everyone signed in can read the menu.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await FoodItem.find().sort({ category: 1, name: 1 });
    res.json({ items, categories: FoodItem.CATEGORIES });
  })
);

// Admin: create item
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { values, errors, valid } = validateDish(req.body);
    if (!valid) return res.status(400).json({ error: 'Please fix the highlighted fields.', errors });

    // Prevent duplicate dish names (case-insensitive).
    const dup = await FoodItem.findOne({ name: new RegExp(`^${values.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (dup) return res.status(409).json({ error: 'A dish with this name already exists.', errors: { name: 'A dish with this name already exists.' } });

    const item = await FoodItem.create(values);
    res.status(201).json({ item });
  })
);

// Admin: update item
router.put(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { values, errors, valid } = validateDish(req.body);
    if (!valid) return res.status(400).json({ error: 'Please fix the highlighted fields.', errors });

    // Block renaming onto another dish's name.
    const dup = await FoodItem.findOne({
      _id: { $ne: req.params.id },
      name: new RegExp(`^${values.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    });
    if (dup) return res.status(409).json({ error: 'A dish with this name already exists.', errors: { name: 'A dish with this name already exists.' } });

    // Only assign whitelisted, validated fields (never trust the raw body).
    const item = await FoodItem.findByIdAndUpdate(req.params.id, values, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ item });
  })
);

// Admin: delete item
router.delete(
  '/:id',
  requireAuth,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    await FoodItem.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  })
);

// Chef or admin: flip availability (this is how the kitchen marks a dish
// "finished" / sold out so students can't order it).
router.patch(
  '/:id/availability',
  requireAuth,
  requireRole('chef', 'admin'),
  asyncHandler(async (req, res) => {
    const item = await FoodItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    item.available = !!req.body.available;
    await item.save();
    res.json({ item });
  })
);

module.exports = router;
