const express = require('express');
const { getDatabase } = require('../config/database');

const router = express.Router();

router.post('/bookings', async (req, res) => {
  try {
    const booking = req.body;
    if (!booking || typeof booking !== 'object' || Array.isArray(booking) || Object.keys(booking).length === 0) {
      return res.status(400).json({ message: 'Booking data cannot be empty' });
    }

    const db = await getDatabase();
    const result = await db.collection('allBookings').insertOne({
      ...booking,
      ...(typeof booking.email === 'string' ? { email: booking.email.trim().toLowerCase() } : {}),
      createdAt: new Date(),
    });
    res.status(201).send(result);
  } catch (error) {
    console.error('Error adding booking data:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/bookings', async (req, res) => {
  const { email } = req.query;

  try {
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const db = await getDatabase();
    const bookings = await db.collection('allBookings')
      .find({ email: email.trim().toLowerCase() })
      .toArray();
    if (!bookings.length) {
      return res.status(404).json({ error: 'No bookings found for this user' });
    }
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching booking data:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/all-bookings', async (req, res) => {
  try {
    const db = await getDatabase();
    const bookings = await db.collection('allBookings').find().toArray();
    res.send(bookings);
  } catch (error) {
    console.error('Error fetching all booking data:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
