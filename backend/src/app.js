const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { BRANCHES, GENDERS, YEARS, SEMESTERS, FOOD_CATEGORIES, FOOD_PREFERENCES } = require('./utils/validate');

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/api/health', (req, res) =>
  res.json({ ok: true, mess: config.messName, time: new Date().toISOString() })
);

// Public-ish config the login / register / dish forms can use (no secrets).
app.get('/api/config', (req, res) =>
  res.json({
    messName: config.messName,
    monthlyAllowance: config.monthlyAllowance,
    dailyLimit: config.dailyLimit,
    branches: BRANCHES,
    genders: GENDERS,
    years: YEARS,
    semesters: SEMESTERS,
    categories: FOOD_CATEGORIES,
    foodPreferences: FOOD_PREFERENCES,
  })
);

app.get('/', (req, res) =>           
  res.json({ service: 'SkipLine API', health: '/api/health' })
);

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/menu', require('./routes/menu.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/admin', require('./routes/admin.routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
