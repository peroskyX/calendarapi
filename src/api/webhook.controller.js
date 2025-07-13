const { establishWebhook } = require('../services/googleCalendar.service');

const MOCK_USER_ID = 'user-1234';

const setupWebhook = async (req, res) => {
  try {
    const result = await establishWebhook(MOCK_USER_ID);
    res.status(200).json({ message: 'Webhook setup initiated successfully.', data: result });
  } catch (error) {
    console.error('Failed to setup webhook:', error);
    res.status(500).json({ error: 'Failed to setup webhook.' });
  }
};

module.exports = {
    setupWebhook,
};
