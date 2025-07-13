require('dotenv').config(); // Loads environment variables from .env file

const express = require('express');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const { connectDatabase } = require('./src/config/database.config');
const apiRoutes = require('./src/api');
const { renewExpiringWebhooks } = require('./src/services/googleCalendar.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies.
app.use(bodyParser.json());

// Mount the API routes
app.use('/api', apiRoutes);

// Schedule a cron job to run every day at midnight to renew expiring webhooks.
cron.schedule('0 0 * * *', () => {
  console.log('Running daily cron job to renew expiring webhooks...');
  renewExpiringWebhooks();
});

// Connect to MongoDB and start the server
connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      // Perform an initial check on startup
      renewExpiringWebhooks();
    });
  })
  .catch(err => {
    console.error('Failed to connect to the database. Server will not start.', err);
    process.exit(1);
  });