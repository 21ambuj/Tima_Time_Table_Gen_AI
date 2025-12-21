const express = require('express');
const router = express.Router();
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Section = require('../models/Section');
const auth = require('../middleware/auth'); // Assuming this exists based on standard patterns

// Helper to clean strings
const clean = (str) => (str || "").toString().trim();

// Universal Import Route
router.post('/universal', auth, async (req, res) => {
    try {
        const { csvData } = req.body; // Expecting raw CSV string or array of objects
        const schoolId = req.user.schoolId;

        if (!csvData) return res.status(400).json({ error: "No data provided" });

        let rows = [];
        if (typeof csvData === 'string') {
            // Basic CSV parser
            const lines = csvData.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',');
                let obj = {};
                headers.forEach((h, idx) => obj[h] = clean(values[idx]));
                rows.push(obj);
            }
        } else {
            rows = csvData; // JSON array fallback
        }

        const stats = {
            teachers: 0,
            subjects: 0,
            rooms: 0,
            sections: 0,
            errors: []
        };

        for (const row of rows) {
            const type = clean(row.type).toLowerCase();
            const name = clean(row.name);

            // Basic fallback if headers are cryptic: 
            // Assume: Type, Name, Department, Detail1 (Email/Code/Cap), Detail2 (Subjs/Cred/Type)

            const dept = clean(row.department || row.dept || "General");

            if (!name) continue;

            try {
                if (type.includes('teacher') || type.includes('faculty')) {
                    // Teacher: Name, Dept, Email (Detail1), Subjects (Detail2)
                    const email = clean(row.detail1 || row.email || `${name.replace(/\s/g, '.')}@school.com`);
                    const subjectsStr = clean(row.detail2 || row.subjects || "");

                    let subjectIds = [];
                    if (subjectsStr) {
                        const subNames = subjectsStr.split(';').map(s => s.trim()).filter(Boolean);
                        const foundSubs = await Subject.find({ schoolId, name: { $in: subNames } });
                        subjectIds = foundSubs.map(s => s._id);
                    }

                    // Upsert Teacher
                    await Teacher.findOneAndUpdate(
                        { schoolId, email },
                        { name, department: dept, qualifiedSubjects: subjectIds },
                        { upsert: true, new: true }
                    );
                    stats.teachers++;

                } else if (type.includes('subject') || type.includes('course')) {
                    // Subject: Name, Dept, Code (Detail1), Workload/Credits (Detail2), Type (Detail3)
                    const code = clean(row.detail1 || row.code || name.substring(0, 3).toUpperCase());
                    let credits = parseInt(row.detail2 || row.credits || "3");
                    if (isNaN(credits)) credits = 3;

                    const sType = clean(row.detail3 || row.type || "theory").toLowerCase();

                    await Subject.findOneAndUpdate(
                        { schoolId, code },
                        { name, department: dept, credits, type: sType.includes('lab') ? 'practical' : 'theory' },
                        { upsert: true }
                    );
                    stats.subjects++;

                } else if (type.includes('room') || type.includes('class') || type.includes('hall')) {
                    // Room: Name, Dept, Capacity (Detail1), Type (Detail2)
                    let cap = parseInt(row.detail1 || row.capacity || "30");
                    if (isNaN(cap)) cap = 30;
                    const rType = clean(row.detail2 || row.type || "LectureHall").toLowerCase();

                    await Classroom.findOneAndUpdate(
                        { schoolId, name },
                        { capacity: cap, department: dept, type: rType.includes('lab') ? 'Lab' : 'LectureHall' },
                        { upsert: true }
                    );
                    stats.rooms++;

                } else if (type.includes('section') || type.includes('batch')) {
                    // Section: Name, Dept
                    await Section.findOneAndUpdate(
                        { schoolId, name },
                        { department: dept },
                        { upsert: true }
                    );
                    stats.sections++;
                }
            } catch (err) {
                stats.errors.push(`Failed row ${name}: ${err.message}`);
            }
        }

        res.json({ success: true, stats });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Import failed" });
    }
});

module.exports = router;
