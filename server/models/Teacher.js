const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  schoolId: { type: String, required: true },
  uid: { type: String },
  name: { type: String, required: true },
  email: { type: String, required: true },
  department: { type: String, default: "General" },
  qualifiedSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }]
});


TeacherSchema.index({ schoolId: 1, email: 1 }, { unique: true });

const Teacher = mongoose.model('Teacher', TeacherSchema);


Teacher.collection.dropIndex('email_1').catch(() => {
   
});

module.exports = Teacher;