require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bookingRoutes = require('./routes/bookings');
const resortRoutes = require('./routes/resorts');
const userRoutes = require('./routes/users');
const handleRequestError = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
}));

app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Interval Server is running');
});

app.use(userRoutes);
app.use(resortRoutes);
app.use(bookingRoutes);

app.use(handleRequestError);

app.all('*', (req, res) => {
  res.status(404).send({ message: 'Route not found' });
});

module.exports = app;
