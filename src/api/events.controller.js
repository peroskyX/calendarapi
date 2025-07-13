const { Event, FetchedRange } = require('../models');
const { fetchAndSyncEvents } = require('../services/googleCalendar.service');

const MOCK_USER_ID = 'user-1234';

const getEvents = async (req, res) => {
  const { startTime, endTime } = req.query;

  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'startTime and endTime query parameters are required.' });
  }

  const startTimeISO = new Date(startTime);
  const endTimeISO = new Date(endTime);

  try {
    const existingRange = await FetchedRange.findOne({
      userId: MOCK_USER_ID,
      startTime: { $lte: startTimeISO },
      endTime: { $gte: endTimeISO },
    });

    if (existingRange) {
      console.log('Cache hit! Fetching events from local database.');
    } else {
      console.log('Cache miss. Fetching events from Google Calendar API.');
      await fetchAndSyncEvents({
        userId: MOCK_USER_ID,
        timeMin: startTimeISO.toISOString(),
        timeMax: endTimeISO.toISOString()
      });
    }

    const events = await Event.find({
      userId: MOCK_USER_ID,
      startDateTime: { $gte: startTimeISO },
      endDateTime: { $lte: endTimeISO },
    });
    res.json(events);

  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
};

module.exports = {
    getEvents,
};
