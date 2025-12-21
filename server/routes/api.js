const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth'); // Required for isolation
const bcrypt = require('bcryptjs'); // Needed for creating users manually

// Import Models
const Timetable = require('../models/Timetable');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const { generateTimetable } = require('../aiEngine');
const Section = require('../models/Section');
const User = require('../models/User'); // Required for Dev Panel

const Support = require('../models/Support');
const Feedback = require('../models/Feedback');

const generateUID = () => `FAC-${Math.floor(1000 + Math.random() * 9000)}`;



// ==========================================
// 1. TEACHER ROUTES (ISOLATED)
// ==========================================
router.get('/teachers', authMiddleware, async (req, res) => {
  try {
    // Filter by School ID
    const teachers = await Teacher.find({ schoolId: req.user.schoolId }).populate('qualifiedSubjects');
    res.json(teachers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/teachers', authMiddleware, async (req, res) => {
  try {
    const newTeacher = new Teacher({
      ...req.body,
      uid: generateUID(),
      schoolId: req.user.schoolId
    });
    await newTeacher.save();
    res.status(201).json(newTeacher);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/teachers/bulk', authMiddleware, async (req, res) => {
  try {
    const teachersData = req.body;
    if (!Array.isArray(teachersData)) return res.status(400).json({ error: "Invalid data" });

    const validTeachers = [];
    for (const t of teachersData) {
      if (t.name && t.email) {
        // Check for duplicates ONLY within this school
        const exists = await Teacher.findOne({ email: t.email, schoolId: req.user.schoolId });
        if (!exists) {
          validTeachers.push({
            name: t.name,
            email: t.email,
            department: t.department || "General",
            uid: generateUID(),
            qualifiedSubjects: t.qualifiedSubjects || [],
            schoolId: req.user.schoolId
          });
        }
      }
    }

    if (validTeachers.length === 0) return res.status(400).json({ message: "No new valid teachers found." });

    await Teacher.insertMany(validTeachers);
    res.status(201).json({ message: `Added ${validTeachers.length} faculty members.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/teachers/:id', authMiddleware, async (req, res) => {
  try {
    // Ensure we only update if it belongs to this school
    const updated = await Teacher.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      req.body,
      { new: true }
    ).populate('qualifiedSubjects');
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/teachers/:id', authMiddleware, async (req, res) => {
  try {
    await Teacher.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/teachers', authMiddleware, async (req, res) => {
  try {
    await Teacher.deleteMany({ schoolId: req.user.schoolId });
    res.json({ message: "All faculty cleared" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 2. SUBJECT ROUTES (ISOLATED)
// ==========================================
router.get('/subjects', authMiddleware, async (req, res) => {
  try {
    const subjects = await Subject.find({ schoolId: req.user.schoolId });
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects', authMiddleware, async (req, res) => {
  try {
    const newSubject = new Subject({
      ...req.body,
      schoolId: req.user.schoolId
    });
    await newSubject.save();
    res.status(201).json(newSubject);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects/bulk', authMiddleware, async (req, res) => {
  try {
    const subjects = req.body;
    if (!Array.isArray(subjects)) return res.status(400).json({ error: "Invalid data" });

    const validSubjects = [];
    for (const s of subjects) {
      if (s.name && s.code) {
        // Check code uniqueness within THIS school
        const exists = await Subject.findOne({ code: s.code, schoolId: req.user.schoolId });
        if (!exists) {
          validSubjects.push({
            name: s.name,
            code: s.code,
            credits: Number(s.credits) || 3,
            type: (s.type && ['theory', 'practical'].includes(s.type.toLowerCase())) ? s.type.toLowerCase() : 'theory',
            department: s.department || "General",
            schoolId: req.user.schoolId
          });
        }
      }
    }

    if (validSubjects.length === 0) return res.status(400).json({ message: "No new subjects added." });

    await Subject.insertMany(validSubjects);
    res.status(201).json({ message: `Added ${validSubjects.length} subjects.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/subjects/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await Subject.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/subjects/:id', authMiddleware, async (req, res) => {
  try {
    await Subject.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/subjects', authMiddleware, async (req, res) => {
  try {
    await Subject.deleteMany({ schoolId: req.user.schoolId });
    res.json({ message: "All subjects cleared" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. CLASSROOM ROUTES (ISOLATED)
// ==========================================
router.get('/classrooms', authMiddleware, async (req, res) => {
  try {
    const rooms = await Classroom.find({ schoolId: req.user.schoolId });
    res.json(rooms);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/classrooms', authMiddleware, async (req, res) => {
  try {
    const newRoom = new Classroom({
      ...req.body,
      schoolId: req.user.schoolId
    });
    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/classrooms/bulk', authMiddleware, async (req, res) => {
  try {
    const classrooms = req.body;
    if (!Array.isArray(classrooms)) return res.status(400).json({ error: "Invalid data" });
    const validRooms = [];
    for (const r of classrooms) {
      if (r.name && r.capacity) {
        const exists = await Classroom.findOne({ name: r.name, schoolId: req.user.schoolId });
        if (!exists) {
          validRooms.push({
            name: r.name,
            capacity: Number(r.capacity),
            type: (r.type && r.type.toLowerCase() === 'lab') ? 'Lab' : 'LectureHall',
            department: r.department || "General",
            schoolId: req.user.schoolId
          });
        }
      }
    }
    if (validRooms.length === 0) return res.status(400).json({ message: "No new rooms added." });
    await Classroom.insertMany(validRooms);
    res.status(201).json({ message: `Added ${validRooms.length} rooms.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/classrooms/:id', authMiddleware, async (req, res) => {
  try {
    const updated = await Classroom.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.user.schoolId },
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/classrooms/:id', authMiddleware, async (req, res) => {
  try {
    await Classroom.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/classrooms', authMiddleware, async (req, res) => {
  try {
    await Classroom.deleteMany({ schoolId: req.user.schoolId });
    res.json({ message: "All classrooms cleared" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. GENERATOR & TIMETABLE (PROTECTED)
// ==========================================

router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { sections } = req.body;
    if (!sections) return res.status(400).json({ error: "Invalid data" });

    // IMPORTANT: The AI engine needs data SPECIFIC to this school. 
    // You might need to update aiEngine.js to accept a schoolId or fetch data inside based on it.
    // However, since aiEngine usually fetches ALL data, we must update it to filter by School ID.
    // For now, let's assume aiEngine.js needs to be updated or we pass the data to it.
    // A quick fix is to pass schoolId to generateTimetable and have it filter.

    const result = await generateTimetable(req.io, sections, req.user.schoolId);
    res.status(200).json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/timetable/save', authMiddleware, async (req, res) => {
  try {
    const { schedule } = req.body;
    const schoolId = req.user.schoolId;

    await Timetable.deleteMany({ schoolId: schoolId });

    const newEntry = new Timetable({
      schoolId: schoolId,
      schedule
    });
    await newEntry.save();

    res.status(200).json({ message: "Saved for School: " + schoolId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/timetable', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const latest = await Timetable.findOne({ schoolId: schoolId }).sort({ createdAt: -1 });
    res.json(latest ? latest.schedule : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/timetable', authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    await Timetable.deleteMany({ schoolId: schoolId });
    res.json({ message: "Cleared school data" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. SUPPORT & FEEDBACK ROUTES (NEW)
// ==========================================

// Support Ticket Route
router.post('/support', async (req, res) => {
  try {
    const { email, phone, issue } = req.body;
    if (!email || !issue) return res.status(400).json({ error: "Email and Issue are required" });

    const newTicket = new Support({ email, phone, issue });
    await newTicket.save();

    res.status(201).json({ message: "Support ticket created successfully!" });
  } catch (err) {
    console.error("Support Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Feedback Route
router.post('/feedback', async (req, res) => {
  try {
    const newFeedback = new Feedback(req.body);
    await newFeedback.save();
    res.status(201).json({ message: "Feedback submitted successfully!" });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. DEVELOPER / SUPER ADMIN ROUTES (ENHANCED)
// ==========================================

// GET ALL USERS
router.get('/dev/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE USER
router.delete('/dev/users/:id', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADD SINGLE USER (Smart Logic)
router.post('/dev/users', authMiddleware, async (req, res) => {
  try {
    const { name, email, password, role, schoolId } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already exists" });

    // Logic: Admin gets new SchoolID, Others require valid SchoolID
    let finalSchoolId = schoolId;
    if (role === 'admin') {
      // If creating an Admin, generate a new School ID if not provided
      if (!finalSchoolId) finalSchoolId = generateSchoolId();
    } else if (role !== 'developer') {
      // If creating Student/Teacher, School ID is MANDATORY
      if (!finalSchoolId) return res.status(400).json({ error: "School ID is required for Students/Teachers" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name, email, password: hashedPassword, role,
      schoolId: finalSchoolId,
      isVerified: true // Direct creation = Auto Verified
    });

    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADD USERS BULK (CSV)
router.post('/dev/users/bulk', authMiddleware, async (req, res) => {
  try {
    const usersData = req.body;
    if (!Array.isArray(usersData)) return res.status(400).json({ error: "Invalid data format" });

    const validUsers = [];
    const salt = await bcrypt.genSalt(10);
    // Default password hash for bulk users (e.g., "123456") to ensure they can login
    // In production, you might want to email them a reset link or use a provided password
    const defaultHash = await bcrypt.hash("123456", salt);

    for (const u of usersData) {
      if (u.name && u.email && u.role) {
        // Check duplicate email globally
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
          let finalSchoolId = u.schoolId;

          // Logic: If CSV row is for Admin and no SchoolID, gen one
          if (u.role === 'admin' && !finalSchoolId) {
            finalSchoolId = generateSchoolId();
          }
          // Logic: If CSV row is Student/Teacher, they MUST have SchoolID. Skip if missing.
          if ((u.role === 'student' || u.role === 'teacher') && !finalSchoolId) {
            continue; // Skip invalid rows
          }

          // Use provided password or default
          let pass = defaultHash;
          if (u.password) {
            pass = await bcrypt.hash(u.password, salt);
          }

          validUsers.push({
            name: u.name,
            email: u.email,
            password: pass,
            role: u.role.toLowerCase(),
            schoolId: finalSchoolId,
            isVerified: true
          });
        }
      }
    }

    if (validUsers.length === 0) return res.status(400).json({ message: "No new valid users found or duplicates skipped." });

    await User.insertMany(validUsers);
    res.status(201).json({ message: `Successfully created ${validUsers.length} users.` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE USER
router.put('/dev/users/:id', authMiddleware, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    } else {
      delete updateData.password;
    }
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedUser);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... (STATS, FEEDBACK, SUPPORT Routes remain same) ...

// GET STATS
router.get('/dev/stats', authMiddleware, async (req, res) => {
  try {
    const counts = {
      admins: await User.countDocuments({ role: 'admin' }),
      teachers: await User.countDocuments({ role: 'teacher' }),
      students: await User.countDocuments({ role: 'student' }),
      feedback: await Feedback.countDocuments(),
      support: await Support.countDocuments()
    };
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dev/feedback', authMiddleware, async (req, res) => {
  try {
    const items = await Feedback.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dev/support', authMiddleware, async (req, res) => {
  try {
    const items = await Support.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/dev/support/:id', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const updatedTicket = await Support.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(updatedTicket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. SECTION ROUTES (NEW - DB PERSISTENCE)
// ==========================================
router.get('/sections', authMiddleware, async (req, res) => {
  try {
    const sections = await Section.find({ schoolId: req.user.schoolId });
    res.json(sections);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sections', authMiddleware, async (req, res) => {
  try {
    const { name, department } = req.body;
    const exists = await Section.findOne({ name, schoolId: req.user.schoolId });
    if (exists) return res.status(400).json({ message: "Section already exists" });

    const newSection = new Section({ name, department, schoolId: req.user.schoolId });
    await newSection.save();
    res.status(201).json(newSection);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/sections/bulk', authMiddleware, async (req, res) => {
  try {
    const sectionsData = req.body;
    if (!Array.isArray(sectionsData)) return res.status(400).json({ error: "Invalid data" });

    const validSections = [];
    for (const s of sectionsData) {
      if (s.name) {
        const exists = await Section.findOne({ name: s.name, schoolId: req.user.schoolId });
        if (!exists) {
          validSections.push({
            name: s.name,
            department: s.department || "General",
            schoolId: req.user.schoolId
          });
        }
      }
    }

    if (validSections.length === 0) return res.status(400).json({ message: "No new unique sections found." });

    await Section.insertMany(validSections);
    res.status(201).json({ message: `Added ${validSections.length} sections.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sections/:id', authMiddleware, async (req, res) => {
  try {
    await Section.findOneAndDelete({ _id: req.params.id, schoolId: req.user.schoolId });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sections', authMiddleware, async (req, res) => {
  try {
    await Section.deleteMany({ schoolId: req.user.schoolId });
    res.json({ message: "All sections cleared" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;