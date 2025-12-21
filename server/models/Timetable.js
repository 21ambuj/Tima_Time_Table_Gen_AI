const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  
  schedule: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Timetable', TimetableSchema);