const mongoose = require('mongoose');

const SupportSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: { type: String, required: true },
  issue: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Support', SupportSchema);