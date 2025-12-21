const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['developer', 'admin', 'teacher', 'student'], 
    required: true 
  },
  // LINKS USER TO A SPECIFIC SCHOOL (Developer might have 'GLOBAL')
  schoolId: { type: String, required: false }, 
  
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date }
});

module.exports = mongoose.model('User', UserSchema);