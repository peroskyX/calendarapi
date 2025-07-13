const { Webhook } = require('../models');
const { fetchAndSyncEvents } = require('../services/googleCalendar.service');

const handleNotification = async (req, res) => {
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];
  const messageNumber = req.headers['x-goog-message-number'];

  console.log(`Received notification for channel ${channelId}, state: ${resourceState}, message: ${messageNumber}`);

  try {
    const webhook = await Webhook.findOne({ channelId: channelId });
    if (!webhook) {
      console.warn(`Notification received for unknown or invalid channel ID: ${channelId}`);
      return res.status(404).send('Not Found');
    }

    if (resourceState === 'sync') {
      console.log(`Webhook ${channelId} successfully synced.`);
      return res.status(200).send();
    }

    if (resourceState === 'exists') {
      console.log(`Triggering incremental sync for user ${webhook.userId} due to notification.`);
      await fetchAndSyncEvents({ userId: webhook.userId, syncToken: webhook.syncToken });
    }

    res.status(200).send();
  } catch (error) {
    console.error('Error processing notification:', error);
    res.status(200).send(); // Respond 200 OK to prevent Google from retrying.
  }
};

module.exports = {
    handleNotification,
};
