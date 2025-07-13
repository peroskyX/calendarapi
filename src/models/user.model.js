const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Using a custom ID like 'user-123'
    refreshToken: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
