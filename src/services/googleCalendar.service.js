const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const { User, Event, Webhook, FetchedRange } = require('../models');

// Load all secrets and configuration from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URL = process.env.BASE_URL;
const WEBHOOK_RECEIVER_URL = `${process.env.BASE_URL}/api/notifications`;

/**
 * Creates and configures an OAuth2 client for a given user from MongoDB.
 */
async function getOAuth2Client(userId) {
  const user = await User.findById(userId);
  if (!user || !user.refreshToken) {
    throw new Error(`User or refresh token not found for userId: ${userId}`);
  }
  const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URL);
  oAuth2Client.setCredentials({ refresh_token: user.refreshToken });
  return oAuth2Client;
}

/**
 * Establishes a new webhook subscription, storing details in MongoDB.
 */
async function establishWebhook(userId) {
  const oAuth2Client = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  await stopWebhookForUser(userId); // Stop any existing channel first

  const channelId = uuidv4();

  const res = await calendar.events.watch({
    calendarId: 'primary',
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: WEBHOOK_RECEIVER_URL,
    },
  });

  console.log('Webhook established:', res.data);

  // Store or update the webhook details in MongoDB
  await Webhook.findOneAndUpdate(
    { userId: userId },
    {
      channelId: channelId,
      userId: userId,
      resourceId: res.data.resourceId,
      expiration: parseInt(res.data.expiration, 10),
    },
    { upsert: true, new: true }
  );

  return res.data;
}

/**
 * Fetches and syncs events from Google Calendar to MongoDB.
 */
async function fetchAndSyncEvents({ userId, timeMin, timeMax, syncToken }) {
  const oAuth2Client = await getOAuth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const params = { calendarId: 'primary', singleEvents: true };
  if (syncToken) {
    params.syncToken = syncToken;
  } else {
    params.timeMin = timeMin;
    if(timeMax) params.timeMax = timeMax;
  }

  let allItems = [];
  let pageToken;
  let nextSyncToken;

  try {
    do {
      if (pageToken) params.pageToken = pageToken;
      const res = await calendar.events.list(params);
      if (res.data.items) {
        allItems = allItems.concat(res.data.items);
      }
      pageToken = res.data.nextPageToken;
      nextSyncToken = res.data.nextSyncToken; // Capture the latest sync token
    } while (pageToken);
  } catch (error) {
      if (error.code === 410) { // "Sync token is invalid or expired"
          console.warn(`Sync token for user ${userId} is invalid. Performing a full sync instead.`);
          await Webhook.updateOne({ userId }, { $unset: { syncToken: "" } });
          const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
          return fetchAndSyncEvents({ userId, timeMin: thirtyDaysAgo });
      }
      throw error;
  }

  console.log(`Sync complete. Fetched ${allItems.length} updated/new items.`);

  if (allItems.length > 0) {
    const operations = allItems.map(event => {
      if (event.status === 'cancelled') {
        return { deleteOne: { filter: { _id: event.id } } };
      } else {
        return {
          updateOne: {
            filter: { _id: event.id },
            update: {
              $set: {
                _id: event.id,
                userId: userId,
                summary: event.summary,
                description: event.description,
                status: event.status,
                startDateTime: event.start?.dateTime || event.start?.date,
                endDateTime: event.end?.dateTime || event.end?.date,
                created: event.created,
                updated: event.updated,
              }
            },
            upsert: true
          }
        };
      }
    });
    await Event.bulkWrite(operations);
  }

  if (nextSyncToken) {
    await Webhook.updateOne({ userId }, { $set: { syncToken: nextSyncToken } });
  }
  if (timeMin && timeMax) {
    await FetchedRange.create({ userId, startTime: new Date(timeMin), endTime: new Date(timeMax) });
  }
}

/**
 * Finds and renews all webhook subscriptions that are about to expire.
 */
async function renewExpiringWebhooks() {
  const threshold = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
  try {
    const webhooks = await Webhook.find({ expiration: { $lt: threshold } });
    if (webhooks.length === 0) {
      console.log("No webhooks nearing expiration.");
      return;
    }
    console.log(`Found ${webhooks.length} webhooks to renew.`);
    for (const webhook of webhooks) {
      try {
        console.log(`Renewing webhook for user ${webhook.userId}...`);
        await establishWebhook(webhook.userId);
        console.log(`Successfully renewed webhook for user ${webhook.userId}.`);
      } catch (error) {
        console.error(`Failed to renew webhook for user ${webhook.userId}:`, error.message);
      }
    }
  } catch (error) {
    console.error('DB error fetching expiring webhooks:', error);
  }
}

/** Helper to stop a webhook for a user using MongoDB */
async function stopWebhookForUser(userId) {
  const webhook = await Webhook.findOne({ userId });
  if (webhook) {
    const oAuth2Client = await getOAuth2Client(userId);
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
    try {
      await calendar.channels.stop({
        requestBody: {
          id: webhook.channelId,
          resourceId: webhook.resourceId,
        },
      });
      console.log(`Successfully stopped webhook channel: ${webhook.channelId}`);
    } catch (error) {
      if (error.code !== 404) { // Ignore "Not Found" errors
        console.error(`Error stopping webhook channel ${webhook.channelId}:`, error);
      }
    } finally {
        await Webhook.deleteOne({ userId });
    }
  }
}

module.exports = {
  establishWebhook,
  fetchAndSyncEvents,
  renewExpiringWebhooks,
};