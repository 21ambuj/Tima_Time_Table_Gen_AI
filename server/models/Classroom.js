const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema({
  schoolId: { type: String, required: true }, // <--- NEW
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['LectureHall', 'Lab'], 
    default: 'LectureHall' 
  },
  department: { type: String, required: true, default: "General" }
});

ClassroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', ClassroomSchema);