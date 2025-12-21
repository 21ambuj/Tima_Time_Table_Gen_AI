const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  q1: { type: String },
  q2: { type: String },
  q3: { type: String },
  q4: { type: String },
  q5: { type: String },
  comments: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);