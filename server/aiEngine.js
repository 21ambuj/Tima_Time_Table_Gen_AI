/* FILE: server/aiEngine.js */

const Teacher = require('./models/Teacher');
const Subject = require('./models/Subject');
const Classroom = require('./models/Classroom');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// 8 Time Slots (09:00 to 05:00)
const SLOT_TIMINGS = [
  '09:00 AM - 10:00 AM', 
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM', 
  '12:00 PM - 01:00 PM', 
  '01:00 PM - 02:00 PM', 
  '02:00 PM - 03:00 PM', 
  '03:00 PM - 04:00 PM', 
  '04:00 PM - 05:00 PM'
];

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Helper: Get formatted time string for block
function getBlockTimeString(startIndex, duration) {
    if (startIndex + duration > SLOT_TIMINGS.length) return "Invalid Time";
    const startTime = SLOT_TIMINGS[startIndex].split(' - ')[0];
    const endTime = SLOT_TIMINGS[startIndex + duration - 1].split(' - ')[1];
    return `${startTime} - ${endTime}`;
}

const normalize = (str) => (str || "General").toString().toUpperCase().trim();

// MODIFICATION: Accepts schoolId to filter data by institution
async function generateTimetable(io, sectionsList, schoolId) {
  if (!sectionsList || sectionsList.length === 0) throw new Error("No sections provided");
  if (!schoolId) throw new Error("School ID missing for generation");

  console.log(`\n🧠 AI Engine: Processing ${sectionsList.length} Sections for School ${schoolId}...`);
  io.emit('progress', { percent: 5, message: `Analyzing Infrastructure...` });

  // 1. Fetch Resources (FILTERED BY SCHOOL ID)
  const teachers = await Teacher.find({ schoolId }).populate('qualifiedSubjects');
  const allSubjects = await Subject.find({ schoolId });
  const rooms = await Classroom.find({ schoolId });

  // Teacher Map
  let teacherMap = {}; 
  teachers.forEach(t => {
    t.qualifiedSubjects.forEach(sub => {
      if(!teacherMap[sub._id]) teacherMap[sub._id] = [];
      teacherMap[sub._id].push(t);
    });
  });

  // Trackers
  let busyTeachers = new Set();
  let busyRooms = new Set();
  let busySections = new Set(); 
  let dailySubjectTracker = {}; 
  
  // Tracker for "One Teacher = One Subject per Section" rule
  let teacherSectionSubjectMap = {};

  let masterTimetable = [];
  
  let shortageReport = { teachers: {}, rooms: { "LectureHall": 0, "Lab": 0 } };

  // 3. Pre-book Lunch (Hidden)
  // We reserve the slot to ensure a gap, but we do NOT add it to masterTimetable.
  io.emit('progress', { percent: 10, message: "Reserving Free Slots..." });
  sectionsList.forEach(sec => {
    DAYS.forEach(day => {
       // Randomly decide lunch slot: 12:00 PM (Index 3) or 01:00 PM (Index 4)
       const lunchIndex = Math.random() > 0.5 ? 3 : 4; 
       
       // BLOCK THE SLOT (So no class is scheduled here)
       busySections.add(`${day}-${lunchIndex}-${sec.name}`);
       
       // NOTE: We deliberately do NOT push to masterTimetable here.
       // This creates an empty "gap" in the schedule.
    });
  });

  // 4. Generate Workload
  let lessonQueue = [];
  sectionsList.forEach(sec => {
    const sectionDept = normalize(sec.department);
    
    // Strict Branch Filtering
    const validSubjects = allSubjects.filter(sub => {
        const subDept = normalize(sub.department);
        return subDept === sectionDept || subDept === 'GENERAL';
    });

    console.log(`   👉 Section ${sec.name}: Found ${validSubjects.length} subjects.`);

    validSubjects.forEach(sub => {
      let credits = sub.credits || 3;
      const isLab = normalize(sub.type) === 'PRACTICAL';
      const duration = isLab ? 2 : 1;
      let numberOfSessions = isLab ? Math.ceil(credits / 2) : credits;

      if(sectionsList.length > 50) numberOfSessions = Math.max(1, Math.floor(numberOfSessions / 2));

      for (let i = 0; i < numberOfSessions; i++) {
        lessonQueue.push({
          id: sub._id,
          name: sub.name,
          type: isLab ? 'practical' : 'theory',
          duration: duration,
          className: sec.name,
          department: sec.department
        });
      }
    });
  });

  shuffle(lessonQueue);
  lessonQueue.sort((a, b) => b.duration - a.duration); 

  const totalLessons = lessonQueue.length;
  let conflictCount = 0;

  // 5. MAIN SCHEDULING LOOP
  for (let i = 0; i < totalLessons; i++) {
    const lesson = lessonQueue[i];
    let placed = false;
    let failedDueToRoom = false;
    let failedDueToTeacher = false;

    // GAP KILLER STRATEGY: Try days randomly, but fill slots sequentially
    let dayIndices = [0, 1, 2, 3, 4];
    shuffle(dayIndices); 

    for (let dIndex of dayIndices) {
        if (placed) break;
        const day = DAYS[dIndex];

        // Try slots 0 to 7 sequentially
        for (let slotIndex = 0; slotIndex <= SLOT_TIMINGS.length - lesson.duration; slotIndex++) {
            
            let indices = [];
            for(let k=0; k<lesson.duration; k++) indices.push(slotIndex + k);
            const timeKeys = indices.map(idx => `${day}-${idx}`);

            // 1. SECTION BUSY?
            if (timeKeys.some(idxStr => busySections.has(`${idxStr}-${lesson.className}`))) continue;

            // 2. DAILY LIMIT
            const dailyKey = `${lesson.className}-${day}`;
            if (!dailySubjectTracker[dailyKey]) dailySubjectTracker[dailyKey] = [];
            if (lesson.type !== 'practical' && dailySubjectTracker[dailyKey].includes(lesson.name)) continue;

            // 3. ROOM CHECK
            const requiredType = (lesson.type === 'practical') ? 'Lab' : 'LectureHall';
            const lessonDept = normalize(lesson.department);

            const suitableRooms = rooms.filter(r => {
                const roomDept = normalize(r.department);
                const rType = normalize(r.type) === 'LAB' ? 'Lab' : 'LectureHall';
                return rType === requiredType && (roomDept === lessonDept || roomDept === 'GENERAL');
            });
            
            const freeRoom = suitableRooms.find(r => 
                timeKeys.every(idxStr => !busyRooms.has(`${idxStr}-${r._id}`))
            );
            
            if (!freeRoom) { failedDueToRoom = true; continue; }

            // 4. TEACHER CHECK (SMART FALLBACK)
            const capableTeachers = teacherMap[lesson.id] || [];
            
            let freeTeacher = capableTeachers.find(t => {
                const isTimeFree = timeKeys.every(idxStr => !busyTeachers.has(`${idxStr}-${t._id}`));
                if (!isTimeFree) return false;

                const lockKey = `${t._id}-${lesson.className}`; 
                const lockedSubject = teacherSectionSubjectMap[lockKey];

                if (lockedSubject && lockedSubject !== lesson.name) return false;
                
                return true;
            });

            // Fallback: If strict check fails, attempt relaxed check (allow same teacher multiple subjects if desperate)
            if (!freeTeacher) {
                 freeTeacher = capableTeachers.find(t => {
                     const isTimeFree = timeKeys.every(idxStr => !busyTeachers.has(`${idxStr}-${t._id}`));
                     if (!isTimeFree) return false;
                     // Relaxed lock check could go here if needed, but keeping strict for now
                     const lockKey = `${t._id}-${lesson.className}`; 
                     const lockedSubject = teacherSectionSubjectMap[lockKey];
                     if (lockedSubject && lockedSubject !== lesson.name) return false;
                     return true;
                 });
            }
            
            if (!freeTeacher) { failedDueToTeacher = true; continue; }

            // --- BOOK IT ---
            timeKeys.forEach(idxStr => {
                busySections.add(`${idxStr}-${lesson.className}`);
                busyRooms.add(`${idxStr}-${freeRoom._id}`);
                busyTeachers.add(`${idxStr}-${freeTeacher._id}`);
            });
            
            // Apply Lock
            const lockKey = `${freeTeacher._id}-${lesson.className}`;
            teacherSectionSubjectMap[lockKey] = lesson.name;

            dailySubjectTracker[dailyKey].push(lesson.name);

            masterTimetable.push({
                day, slotIndex: indices[0], 
                className: lesson.className,
                department: lesson.department,
                subject: lesson.name, 
                teacher: freeTeacher.name, 
                room: freeRoom.name,
                type: lesson.type, 
                time: getBlockTimeString(indices[0], lesson.duration)
            });
            placed = true;
            break;
        }
    }

    if (!placed) {
        conflictCount++;
        if (failedDueToTeacher) shortageReport.teachers[lesson.name] = (shortageReport.teachers[lesson.name] || 0) + 1;
        else if (failedDueToRoom) {
            const rType = (lesson.type === 'practical') ? 'Lab' : 'LectureHall';
            shortageReport.rooms[rType] = (shortageReport.rooms[rType] || 0) + 1;
        }
    }

    if (i % 25 === 0) io.emit('progress', { percent: Math.floor((i/totalLessons)*80) + 10, message: `Scheduling ${lesson.className}: ${lesson.subject}` });
  }

  const dayOrder = { "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5 };
  masterTimetable.sort((a, b) => {
    if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
    if (a.className !== b.className) return a.className.localeCompare(b.className);
    return a.slotIndex - b.slotIndex;
  });

  let alertData = null;
  if (conflictCount > 0) alertData = { count: conflictCount, details: shortageReport };

  io.emit('progress', { percent: 100, message: "Done!" });
  return { schedule: masterTimetable, alert: alertData };
}

module.exports = { generateTimetable };