require('dotenv').config();

const { MongoClient, ServerApiVersion } = require('mongodb');

const databaseName = process.env.DB_NAME || 'Interval';
const uri = process.env.MONGODB_URI || (
  process.env.DB_PASS
    ? `mongodb+srv://IntervalServer:${encodeURIComponent(process.env.DB_PASS)}@cluster0.sju0f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
    : null
);

if (!uri) {
  console.warn('MongoDB is not configured. Set MONGODB_URI or DB_PASS before using database routes.');
}

const client = uri ? new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
}) : null;

let db;
let databasePromise;

async function getDatabase() {
  if (db) return db;
  if (!client) throw new Error('Database connection is not configured');

  if (!databasePromise) {
    databasePromise = client.connect()
      .then(() => {
        db = client.db(databaseName);
        console.log('MongoDB connected lazily.');
        return db;
      })
      .catch((error) => {
        databasePromise = undefined;
        console.error('Error connecting to MongoDB:', error);
        throw new Error('Database connection failed');
      });
  }

  return databasePromise;
}

async function closeDatabase() {
  if (client) await client.close();
}

module.exports = { closeDatabase, getDatabase };
