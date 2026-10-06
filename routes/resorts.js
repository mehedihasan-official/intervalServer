const express = require('express');
const { getDatabase } = require('../config/database');

const router = express.Router();
const MAX_RESORTS_PER_REQUEST = 1700;
const RESORT_RESPONSE_DELAY_MS = 2_000;

router.post('/add-resort', async (req, res) => {
  try {
    const resortData = req.body;
    if (
      !resortData
      || typeof resortData !== 'object'
      || Array.isArray(resortData)
      || Object.keys(resortData).length === 0
    ) {
      return res.status(400).send({ message: 'Resort data cannot be empty' });
    }

    const db = await getDatabase();
    const result = await db.collection('AllResorts').insertOne({
      ...resortData,
      createdAt: new Date(),
    });

    res.status(201).send({
      message: 'Resort data successfully added',
      resortId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding resort:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

router.get('/resort-data', async (req, res) => {
  const requestedAt = Date.now();

  try {
    const db = await getDatabase();
    const resorts = await db.collection('AllResorts')
      .find()
      .limit(MAX_RESORTS_PER_REQUEST)
      .toArray();

    const remainingDelay = RESORT_RESPONSE_DELAY_MS - (Date.now() - requestedAt);
    if (remainingDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingDelay));
    }
    res.status(200).send(resorts);
  } catch (error) {
    console.error('Error fetching resorts:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

module.exports = router;
