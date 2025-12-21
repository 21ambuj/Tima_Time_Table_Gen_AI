import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

import UniversalUpload from '../components/UniversalUpload';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Data stores
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]); // { from: 'user'|'bot', text }
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const messagesRef = useRef(null);

  // Fetch function moved out to be reusable
  const fetchAll = async () => {
    setLoadingData(true);
    setLoadError('');
    try {
      const [
        subjectsRes,
        teachersRes,
        sectionsRes,
        roomsRes,
        timetableRes
      ] = await Promise.all([
        axios.get('http://localhost:5000/api/subjects').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/teachers').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/sections').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/classrooms').catch(() => ({ data: [] })),
        axios.get('http://localhost:5000/api/timetable').catch(() => ({ data: [] }))
      ]);

      setSubjects(subjectsRes.data || []);
      setTeachers(teachersRes.data || []);
      setRooms(roomsRes.data || []);
      setTimetable(timetableRes.data || []);

      setSections(sectionsRes.data || []);

    } catch (err) {
      console.error('Admin fetch error', err);
      setLoadError('Failed to load admin data.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ---------- SMART BOT LOGIC ----------

  const botSpeak = async (text) => {
    setBotTyping(true);
    const delay = 300 + Math.floor(Math.random() * 700);
    await new Promise(r => setTimeout(r, delay));
    setChatMessages(prev => [...prev, { from: 'bot', text }]);
    setBotTyping(false);
    setTimeout(() => messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight), 60);
  };

  const answerAdminQuery = async (query) => {
    const q = (query || '').toLowerCase().trim();

    // 1. DETECT DEPARTMENT CONTEXT
    const deptMatch = q.match(/\b(cse|mec|mech|civil|general)\b/i);
    const deptFilter = deptMatch ? deptMatch[0].toUpperCase() : null;

    // --- ENTITY LOOKUPS ---

    // Specific Teacher Lookup
    const targetTeacher = teachers.find(t => q.includes(t.name.toLowerCase()));
    if (targetTeacher) {
      const tClasses = timetable.filter(t => t.teacher === targetTeacher.name);
      const subjs = [...new Set(tClasses.map(c => c.subject))];
      const lines = [
        `**${targetTeacher.name}** (${targetTeacher.department || 'General'})`,
        `• Email: ${targetTeacher.email}`,
        `• Weekly Load: ${tClasses.length} classes`,
        `• Teaching: ${subjs.join(', ') || 'No subjects assigned'}`
      ];
      await botSpeak(lines.join('\n'));
      return;
    }

    // Specific Room Lookup
    const targetRoom = rooms.find(r => q.includes(r.name.toLowerCase()));
    if (targetRoom) {
      const rClasses = timetable.filter(t => t.room === targetRoom.name);
      const lines = [
        `**${targetRoom.name}**`,
        `• Type: ${targetRoom.type}`,
        `• Capacity: ${targetRoom.capacity}`,
        `• Dept: ${targetRoom.department}`,
        `• Utilization: ${rClasses.length} slots booked this week`
      ];
      await botSpeak(lines.join('\n'));
      return;
    }

    // --- COUNTS & LISTS ---

    // SECTIONS / CLASSES (Priority check for "no of sections" etc)
    if (q.includes('section') || q.includes('class') || q.includes('batch')) {
      // Try to match specific section name like "K23-A"
      const secMatch = sections.find(s => q.includes(s.name.toLowerCase()));

      if (secMatch) {
        const classes = timetable.filter(t => t.className === secMatch.name);
        await botSpeak(`Section **${secMatch.name}** (${secMatch.department}) has **${classes.length}** classes scheduled this week.`);
        return;
      }

      // Handle "no of sections", "how many sections", "count sections"
      if (q.includes('how many') || q.includes('count') || q.includes('no of') || q.includes('number of')) {
        await botSpeak(`Total active sections: **${sections.length}**`);
        return;
      }

      // Handle "name of section", "list sections", "show sections"
      if (q.includes('list') || q.includes('show') || q.includes('name') || q.includes('what are')) {
        if (sections.length === 0) {
          await botSpeak("No sections found.");
          return;
        }
        const names = sections.map(s => s.name).slice(0, 15).join(', ');
        await botSpeak(`Sections (${sections.length}): ${names}${sections.length > 15 ? '...' : ''}`);
        return;
      }
    }

    // SUBJECTS
    if (q.includes('subject') || q.includes('course')) {
      let filtered = subjects;
      if (deptFilter) filtered = subjects.filter(s => (s.department || '').toUpperCase().includes(deptFilter));

      if (q.includes('how many') || q.includes('count') || q.includes('no of') || q.includes('number of')) {
        await botSpeak(`There are **${filtered.length}** ${deptFilter || ''} subjects registered.`);
        return;
      }
      if (q.includes('list') || q.includes('show') || q.includes('name') || q.includes('what are')) {
        const names = filtered.map(s => s.name).slice(0, 15).join(', ');
        await botSpeak(`Subjects (${filtered.length}): ${names}${filtered.length > 15 ? '...' : ''}`);
        return;
      }
    }

    // TEACHERS
    if (q.includes('teacher') || q.includes('faculty') || q.includes('staff')) {
      let filtered = teachers;
      if (deptFilter) filtered = teachers.filter(t => (t.department || '').toUpperCase().includes(deptFilter));

      if (q.includes('how many') || q.includes('count') || q.includes('no of') || q.includes('number of')) {
        await botSpeak(`We have **${filtered.length}** ${deptFilter || ''} faculty members.`);
        return;
      }
      if (q.includes('list') || q.includes('show') || q.includes('name') || q.includes('who are')) {
        const names = filtered.map(t => t.name).slice(0, 15).join(', ');
        await botSpeak(`Teachers (${filtered.length}): ${names}${filtered.length > 15 ? '...' : ''}`);
        return;
      }
    }

    // ROOMS
    if (q.includes('room') || q.includes('lab') || q.includes('hall')) {
      let filtered = rooms;
      if (q.includes('lab')) filtered = filtered.filter(r => r.type === 'Lab');
      if (q.includes('hall')) filtered = filtered.filter(r => r.type === 'LectureHall');
      if (deptFilter) filtered = filtered.filter(r => (r.department || '').toUpperCase().includes(deptFilter));

      if (q.includes('how many') || q.includes('count') || q.includes('no of') || q.includes('number of')) {
        await botSpeak(`Found **${filtered.length}** rooms matching your criteria.`);
        return;
      }
      if (q.includes('list') || q.includes('show') || q.includes('name') || q.includes('which')) {
        const names = filtered.map(r => r.name).slice(0, 15).join(', ');
        await botSpeak(`Rooms (${filtered.length}): ${names}${filtered.length > 15 ? '...' : ''}`);
        return;
      }
    }

    // --- SPECIAL QUERIES ---

    // Workload / Busiest
    if (q.includes('workload') || q.includes('busy') || q.includes('busiest')) {
      const map = {};
      // Calculate based on timetable slots
      timetable.forEach(t => {
        // Ignore breaks or empty slots if any
        if (t.teacher && t.teacher !== '-' && t.teacher !== 'All') {
          map[t.teacher] = (map[t.teacher] || 0) + 1;
        }
      });

      // Sort descending
      const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);

      if (sorted.length === 0) {
        await botSpeak("No workload data available (timetable might be empty).");
        return;
      }

      const msg = sorted.map(([name, count]) => `• ${name}: ${count} classes`).join('\n');
      await botSpeak(`Busiest Teachers (Weekly Slots):\n${msg}`);
      return;
    }

    // Greet/Help
    if (q.match(/^(hi|hello|hey)/)) {
      await botSpeak("Hello Admin! I can give you stats on Teachers, Subjects, Rooms, or Sections. Try 'Count CSE teachers' or 'Show Labs'.");
      return;
    }

    // Fallback
    await botSpeak("I didn't quite catch that. Try asking about 'Teachers', 'Subjects', 'Rooms', or 'Workload'. You can also filter by department like 'CSE' or 'MECH'.");
  };

  const sendMessage = async () => {
    const text = (chatInput || '').trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { from: 'user', text }]);
    setChatInput('');
    setChatOpen(true);
    setTimeout(() => answerAdminQuery(text), 150);
  };

  const quickAsk = (q) => {
    setChatMessages(prev => [...prev, { from: 'user', text: q }]);
    setTimeout(() => answerAdminQuery(q), 120);
  };

  useEffect(() => {
    setTimeout(() => messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight), 80);
  }, [chatMessages, botTyping]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative overflow-hidden selection:bg-indigo-500 selection:text-white flex flex-col">

      <div className="relative z-10 container mx-auto px-6 py-8 max-w-7xl flex-grow flex flex-col">

        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 border-b border-slate-200 pb-6 gap-4 shrink-0">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Control Center</span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-2">
              Admin<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Panel</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-slate-500 text-sm font-medium">Welcome, <span className="font-bold text-slate-800">{user?.name}</span></p>
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-2">
                <span>🏫 CODE:</span>
                <span className="tracking-widest text-sm">{user?.schoolId || "N/A"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-6 py-2.5 bg-white text-red-600 border-2 border-red-50 rounded-xl hover:bg-red-50 hover:border-red-100 transition-all text-sm font-bold flex items-center gap-2 shadow-sm hover:shadow-md"
          >
            <span>🚪</span> Logout
          </button>
        </div>

        {/* --- KEY METRICS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 animate-fade-in">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 hover:shadow-md transition">
            <div className="text-3xl font-black text-pink-500">{subjects.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subjects</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 hover:shadow-md transition">
            <div className="text-3xl font-black text-indigo-500">{teachers.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teachers</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 hover:shadow-md transition">
            <div className="text-3xl font-black text-amber-500">{rooms.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rooms</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-1 hover:shadow-md transition">
            <div className="text-3xl font-black text-cyan-500">{sections.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sections</div>
          </div>
        </div>

        {/* --- DASHBOARD GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in pb-10">


          {/* 1. SUBJECTS */}
          <Link to="/subjects" className="group relative rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-pink-200 bg-white border border-slate-100 overflow-hidden min-h-[240px] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700 ease-out opacity-50"></div>
            <div className="h-full p-8 relative bg-gradient-to-br from-white via-white to-pink-50/30 group-hover:to-pink-100/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">📚</div>
                  <div className="w-10 h-10 rounded-full border border-pink-100 flex items-center justify-center text-pink-400 group-hover:bg-pink-600 group-hover:text-white group-hover:border-pink-600 transition-all duration-300">→</div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-pink-700 transition-colors">Subjects</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Define courses, credit hours, and assign theory/practical types.</p>
              </div>
            </div>
          </Link>

          {/* 2. TEACHERS */}
          <Link to="/teachers" className="group relative rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-200 bg-white border border-slate-100 overflow-hidden min-h-[240px] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700 ease-out opacity-50"></div>
            <div className="h-full p-8 relative bg-gradient-to-br from-white via-white to-indigo-50/30 group-hover:to-indigo-100/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">👩‍🏫</div>
                  <div className="w-10 h-10 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300">→</div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">Teachers</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Manage faculty profiles, workloads, and subject qualifications.</p>
              </div>
            </div>
          </Link>

          {/* 3. CLASSROOMS */}
          <Link to="/rooms" className="group relative rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-200 bg-white border border-slate-100 overflow-hidden min-h-[240px] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700 ease-out opacity-50"></div>
            <div className="h-full p-8 relative bg-gradient-to-br from-white via-white to-amber-50/30 group-hover:to-amber-100/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">🏫</div>
                  <div className="w-10 h-10 rounded-full border border-amber-100 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-all duration-300">→</div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-amber-700 transition-colors">Classrooms</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Configure lecture halls and laboratories with capacity limits.</p>
              </div>
            </div>
          </Link>

          {/* 4. SECTIONS */}
          <Link to="/sections" className="group relative rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-200 bg-white border border-slate-100 overflow-hidden min-h-[240px] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700 ease-out opacity-50"></div>
            <div className="h-full p-8 relative bg-gradient-to-br from-white via-white to-cyan-50/30 group-hover:to-cyan-100/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">👥</div>
                  <div className="w-10 h-10 rounded-full border border-cyan-100 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white group-hover:border-cyan-600 transition-all duration-300">→</div>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-cyan-700 transition-colors">Sections</h3>
                <p className="text-slate-500 font-medium leading-relaxed">Create and manage student batches (e.g. K23-1) for scheduling.</p>
              </div>
            </div>
          </Link>

          {/* 5. GENERATOR */}
          <Link to="/generate" className="group relative rounded-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-emerald-200 bg-white border border-slate-100 overflow-hidden md:col-span-2 min-h-[240px]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-125 duration-700 ease-out opacity-50"></div>
            <div className="h-full p-8 relative bg-gradient-to-br from-white via-white to-emerald-50/30 group-hover:to-emerald-100/50 flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center text-5xl shadow-sm shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">⚡</div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-black text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors">AI Generator Engine</h3>
                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-8 max-w-lg">
                  Run the advanced genetic algorithm to automatically distribute workload and generate conflict-free timetables.
                </p>
                <span className="inline-flex items-center px-6 py-3 rounded-xl bg-emerald-600 text-white text-base font-bold shadow-lg shadow-emerald-200 group-hover:bg-emerald-700 group-hover:shadow-emerald-300 transition-all transform group-hover:translate-x-1">
                  Launch Engine 🚀
                </span>
              </div>
            </div>
          </Link>

        </div>

        {/* --- UNIVERSAL IMPORT (Bottom) --- */}
        <UniversalUpload onUploadSuccess={fetchAll} />
      </div>

      {/* --- FLOATING AI BOT (LEFT SIDE) --- */}
      <div
        onClick={() => setChatOpen(v => !v)}
        className="fixed bottom-6 left-6 z-50 bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:bg-indigo-700 transition hover:scale-110 active:scale-95"
        title="Tima AI"
      >
        {/* Message Icon */}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
      </div>

      {chatOpen && (
        <div className="fixed bottom-24 left-6 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <div>
                <div className="text-lg font-bold text-slate-800">Tima - AI Assistance</div>
                <div className="text-xs text-slate-400 font-medium">Ask about your data</div>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
          </div>

          <div ref={messagesRef} className="h-72 overflow-y-auto bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 space-y-3 custom-scrollbar">
            {chatMessages.length === 0 && (
              <div className="text-sm text-slate-500 text-center mt-8">
                👋 <strong>Hi there!</strong><br />
                Try asking me:<br /><br />
                "Count CSE teachers"<br />
                "List labs"<br />
                "Schedule for Ambuj1"<br />
                "Who has most classes?"
              </div>
            )}

            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${m.from === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`} style={{ whiteSpace: 'pre-line' }}>
                  {m.text}
                </div>
              </div>
            ))}

            {botTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl rounded-bl-none text-slate-400 text-xs italic animate-pulse">
                  Tima is thinking...
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => quickAsk('Count teachers')} className="px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition">Count Teachers</button>
            <button onClick={() => quickAsk('List all sections')} className="px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition">List Sections</button>
            <button onClick={() => quickAsk('Busiest teachers')} className="px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition">Workload</button>
          </div>

          <div className="flex gap-2 relative">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' ? sendMessage() : null}
              placeholder="Ask Tima..."
              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              autoFocus
            />
            <button onClick={sendMessage} className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-md">➤</button>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in { animation: fadeIn 0.5s ease-out; }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>
    </div>
  );
}

export default AdminDashboard;