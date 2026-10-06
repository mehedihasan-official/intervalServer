const app = require('./app');
const { closeDatabase } = require('./config/database');

const port = process.env.PORT || 5000;

if (require.main === module) {
  const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

  async function shutdown() {
    server.close(async (error) => {
      if (error) {
        console.error('Error closing HTTP server:', error);
        process.exitCode = 1;
      }

      try {
        await closeDatabase();
        console.log('MongoDB connection closed');
      } catch (databaseError) {
        console.error('Error closing MongoDB connection:', databaseError);
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = app;
