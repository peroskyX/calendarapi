const mongoose = require('mongoose');
const { User, Event } = require('../models');

// Load MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI;

// A helper function to drop an old index if it exists.
const dropIndex = async () => {
    try {
      await Event.collection.dropIndex('googleEventId_1');
      console.log('Successfully dropped legacy googleEventId_1 index.');
    } catch (error) {
      if (error.codeName !== 'IndexNotFound') {
        console.error('Error dropping index:', error);
      }
    }
};

// A helper function to clear stale data on startup.
const clearEvents = async () => {
  try {
    await Event.deleteMany({});
    console.log('Cleared all events from the database.');
  } catch (error) {
    console.error('Error clearing events:', error);
  }
};

// Seed the database with a mock user for demonstration purposes
const seedUserData = async () => {
    try {
        const userExists = await User.findById('user-1234');
        if (!userExists) {
            await User.create({
                _id: 'user-1234',
                // Load refresh token from environment variables
                refreshToken: process.env.MOCK_USER_REFRESH_TOKEN,
            });
            console.log('Mock user created.');
        }
    } catch (error) {
        console.error('Error seeding user data:', error);
    }
};

const connectDatabase = async () => {
    try {
        if (!MONGO_URI) {
            throw new Error('MONGO_URI is not defined in the .env file.');
        }
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB.');
        
        await seedUserData();
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
};

module.exports = { connectDatabase };