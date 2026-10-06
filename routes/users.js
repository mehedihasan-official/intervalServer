const express = require('express');
const { getDatabase } = require('../config/database');

const router = express.Router();

router.get('/all-users', async (req, res) => {
  try {
    const db = await getDatabase();
    const users = await db.collection('users').find().toArray();
    res.status(200).send(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || !email.trim()) {
      return res.status(400).send({ message: 'Name and email are required' });
    }

    const db = await getDatabase();
    const users = db.collection('users');
    const existingUser = await users.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(409).send({ message: 'User with this email already exists' });
    }

    const result = await users.insertOne({
      ...req.body,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      createdAt: new Date(),
    });
    res.status(201).send({
      message: 'User successfully added',
      userId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

router.get('/users/:email?', async (req, res) => {
  try {
    const pathEmail = req.params.email
      ? req.params.email.replace(/^email=/, '')
      : undefined;
    const email = pathEmail || req.query.email;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).send({ message: 'Email is required' });
    }

    const db = await getDatabase();
    const user = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

router.patch('/update-user', async (req, res) => {
  const { email, isAdmin } = req.body || {};

  try {
    if (typeof email !== 'string' || !email.trim() || typeof isAdmin !== 'boolean') {
      return res.status(400).send('Email and isAdmin status are required');
    }

    const db = await getDatabase();
    const result = await db.collection('users').updateOne(
      { email: email.trim().toLowerCase() },
      { $set: { isAdmin } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send('User not found or role not updated');
    }

    const updatedUser = await db.collection('users').findOne({
      email: email.trim().toLowerCase(),
    });
    res.send(updatedUser);
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).send('Internal Server Error');
  }
});

router.patch('/update-user-info', async (req, res) => {
  const { email, age, securityDeposit, idNumber } = req.body || {};

  try {
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const db = await getDatabase();
    const result = await db.collection('users').updateOne(
      { email: email.trim().toLowerCase() },
      { $set: { age, securityDeposit, idNumber } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or information not updated.',
      });
    }

    res.json({
      success: true,
      message: 'User information updated successfully.',
    });
  } catch (error) {
    console.error('Error updating user info:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

module.exports = router;
