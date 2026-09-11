const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`Incoming ${req.method} request to ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', req.body);
  }
  next();
});

 //need to remove the extra 's' in `DB_PASSs` in the MongoDB connection string. It should be `DB_PASS`. Here's the corrected line:

// MongoDB connection setup
const uri = `mongodb+srv://IntervalServer:${process.env.DB_PASSs}@cluster0.sju0f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db, ResortDataCollection, UserDataCollection, allBookingsCollection;

/**
 * Lazy connection to MongoDB.
 * Ensures the database connection is established only when needed.
 */
async function getDatabase() {
  if (!db) {
    try {
      await client.connect();
      db = client.db('Interval');
      ResortDataCollection = db.collection('AllResorts');
      UserDataCollection = db.collection('users');
      allBookingsCollection = db.collection('allBookings');
      console.log('MongoDB connected lazily.');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
      throw new Error('Database connection failed');
    }
  }
}

// ==================== Routes ====================

/**
 * Root route to check if the server is running.
 */
app.get('/', (req, res) => {
  res.send('Interval Server is running');
});

// ==================== User Routes ====================

/**
 * Fetch all users.
 */
/**
 * app.get('/all-users', async (req, res) => {
  try {
    await getDatabase();
    const users = await UserDataCollection.find().toArray();
    res.status(200).send(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

/**
 * Add a new user.
 */
app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).send({ message: 'Name and email are required' });
    }

    await getDatabase();
    const existingUser = await UserDataCollection.findOne({ email });
    if (existingUser) {
      return res.status(409).send({ message: 'User with this email already exists' });
    }

    const result = await UserDataCollection.insertOne(req.body);
    res.status(201).send({
      message: 'User successfully added',
      userId: result.insertedId,
    });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

/**
 * Fetch user by email.
 */
/**
 * 
 * app.get('/users/:email?', async (req, res) => {
  try {
    const email = req.params.email || req.query.email;
    if (!email) {
      return res.status(400).send({ message: 'Email is required' });
    }

    await getDatabase();
    const user = await UserDataCollection.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.status(200).send(user);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

/**
 * Update user role (admin or not).
 */
app.patch('/update-user', async (req, res) => {
  const { email, isAdmin } = req.body;

  try {
    if (!email || typeof isAdmin !== 'boolean') {
      return res.status(400).send('Email and isAdmin status are required');
    }

    await getDatabase();
    const result = await UserDataCollection.updateOne(
      { email },
      { $set: { isAdmin } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send('User not found or role not updated');
    }

    res.send({ success: true, message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Update or add user info (e.g., age, security deposit, ID number).
 */
app.patch('/update-user-info', async (req, res) => {
  const { email, age, securityDeposit, idNumber } = req.body;

  try {
    await getDatabase();
    const result = await UserDataCollection.updateOne(
      { email },
      { $set: { age, securityDeposit, idNumber } }
    );

    if (result.modifiedCount === 0) {
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

// ==================== Resort Routes ====================

/**
 * Add a new resort.
 */
app.post('/add-resort', async (req, res) => {
  try {
    const resortData = req.body;
    if (!resortData || Object.keys(resortData).length === 0) {
      return res.status(400).send({ message: 'Resort data cannot be empty' });
    }

    await getDatabase();
    const result = await ResortDataCollection.insertOne({
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

/**
 * Fetch all resorts.
 */


/** 
 * app.get('/resort-data', async (req, res) => {
  try {
    await getDatabase();
    const resorts = await ResortDataCollection.find().toArray();
    res.status(200).send(resorts);
  } catch (error) {
    console.error('Error fetching resorts:', error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

// ==================== Booking Routes ====================

/**
 * Add a new booking.
 */
app.post('/bookings', async (req, res) => {
  try {
    const booking = req.body;
    await getDatabase();
    const result = await allBookingsCollection.insertOne(booking);
    res.send(result);
  } catch (error) {
    console.error('Error adding booking data:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Fetch bookings by user email.
 */
app.get('/bookings', async (req, res) => {
  const { email } = req.query;

  try {
    await getDatabase();
    const bookings = await allBookingsCollection.find({ email }).toArray();
    if (!bookings.length) {
      return res.status(404).json({ error: 'No bookings found for this user' });
    }
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching booking data:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Fetch all bookings.
 */
/**
 * 
 * app.get('/all-bookings', async (req, res) => {
  try {
    await getDatabase();
    const bookings = await allBookingsCollection.find().toArray();
    res.send(bookings);
  } catch (error) {
    console.error('Error fetching all booking data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ==================== Error Handling ====================

/**
 * Catch-all route for undefined routes.
 */
app.all('*', (req, res) => {
  res.status(404).send({ message: 'Route not found' });
});

// ==================== Server Shutdown ====================

/**
 * Graceful shutdown on SIGINT (Ctrl+C).
 */
process.on('SIGINT', () => {
  client.close();
  console.log('MongoDB connection closed');
  process.exit();
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});