const mongoose = require('mongoose');
const SectionSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, default: 'General' }
});
SectionSchema.index({ schoolId: 1, name: 1 }, { unique: true });
module.exports = mongoose.model('Section', SectionSchema);
