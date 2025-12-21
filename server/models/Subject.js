const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  schoolId: { type: String, required: true }, // <--- NEW
  name: { type: String, required: true },
  code: { type: String, required: true },
  credits: { type: Number, default: 3 },
  type: { 
    type: String, 
    enum: ['theory', 'practical'], 
    default: 'theory' 
  },
  department: { type: String, required: true, default: "General" }
});

SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema);