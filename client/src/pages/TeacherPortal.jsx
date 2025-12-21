import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function TeacherPortal() {
  const navigate = useNavigate();
  const [timetableData, setTimetableData] = useState([]);
  const [teacherList, setTeacherList] = useState([]); // List of names
  const [teacherDetails, setTeacherDetails] = useState([]); // Full details for UID lookup
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI States
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [activeDay, setActiveDay] = useState("Monday");

  // --- NEW STATES FOR SEARCHABLE DROPDOWN ---
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // ------------------------------------------

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]); // { from: 'user'|'bot', text }
  const [botTyping, setBotTyping] = useState(false);
  const messagesRef = useRef(null);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    if (DAYS.includes(today)) setActiveDay(today);

    // Fetch Timetable AND Teachers (to get UIDs)
    const fetchData = async () => {
      try {
        const [timeRes, techRes] = await Promise.all([
          axios.get('http://localhost:5000/api/timetable'),
          axios.get('http://localhost:5000/api/teachers')
        ]);

        const tData = timeRes.data || [];
        if (tData.length === 0) setError("No schedule published yet.");

        setTimetableData(tData);
        setTeacherDetails(techRes.data || []);

        // Extract unique teacher names from timetable (fallback to teachers list)
        const namesFromTimetable = [...new Set(tData.map(i => i.teacher))].filter(t => t && t !== '-' && t !== 'All');
        const teacherNames = namesFromTimetable.length
          ? namesFromTimetable.sort()
          : (techRes.data || []).map(t => t.name).filter(Boolean).sort();

        setTeacherList(teacherNames);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to load data.");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper to find UID
  const getTeacherUID = (name) => {
    const found = teacherDetails.find(t => t.name === name);
    return found ? found.uid : "";
  };

  // ---------- robust time parser to ensure sorting from 09:00 to 17:00 ----------
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    try {
      const startPart = timeStr.split('-')[0].trim(); // "09:00 AM"
      const parts = startPart.split(' ');
      const hm = parts[0].split(':');
      let hh = parseInt(hm[0], 10);
      const mm = parseInt(hm[1] || '0', 10);

      const ampm = (parts[1] || '').toUpperCase();
      if (ampm === 'PM' && hh !== 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      return hh * 60 + mm;
    } catch (e) {
      // fallback to lexical compare if unexpected format
      return 0;
    }
  };

  const parseRangeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return [0, 0];
    try {
      const parts = timeStr.split('-').map(p => p.trim());
      const parseSingle = (p) => {
        const bits = p.split(' ');
        const hm = bits[0].split(':');
        let hh = parseInt(hm[0], 10);
        const mm = parseInt(hm[1] || '0', 10);
        const ampm = (bits[1] || '').toUpperCase();
        if (ampm === 'PM' && hh !== 12) hh += 12;
        if (ampm === 'AM' && hh === 12) hh = 0;
        return hh * 60 + mm;
      };
      const s = parseSingle(parts[0]);
      const e = parseSingle(parts[1] || parts[0]);
      return [s, e];
    } catch (err) {
      return [parseTimeToMinutes(timeStr), parseTimeToMinutes(timeStr) + 60];
    }
  };

  // Now use this parser to sort teacher's schedule for the selected day.
  const mySchedule = timetableData
    .filter(i => i.teacher === selectedTeacher && i.day === activeDay)
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  // Card Color Logic
  const getCardStyle = (subject) => {
    const colors = [
      'border-l-indigo-500 shadow-indigo-100',
      'border-l-rose-500 shadow-rose-100',
      'border-l-emerald-500 shadow-emerald-100',
      'border-l-amber-500 shadow-amber-100',
      'border-l-cyan-500 shadow-cyan-100'
    ];
    let hash = 0;
    const s = subject || '';
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ---------- Bot logic helpers (teacher-focused) ----------
  const getClassesOnDay = (teacherName, day) => {
    return timetableData
      .filter(s => s.teacher === teacherName && s.day === day)
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  };

  const getFirstClassOnDay = (teacherName, day) => {
    const list = getClassesOnDay(teacherName, day);
    return list.length ? list[0] : null;
  };

  const getClassesThisWeek = (teacherName) => {
    return timetableData
      .filter(s => s.teacher === teacherName)
      .sort((a, b) => {
        const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
        if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      });
  };

  const getLabsThisWeek = (teacherName) => {
    return getClassesThisWeek(teacherName).filter(s => (s.type || '').toLowerCase() === 'practical' || (s.type || '').toLowerCase() === 'lab');
  };

  const hasBreakOnDay = (teacherName, day) => {
    return getClassesOnDay(teacherName, day).some(s => (s.type || '').toLowerCase() === 'break' || (s.subject || '').toLowerCase().includes('lunch'));
  };

  const getCurrentClass = (teacherName) => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const list = timetableData.filter(s => s.teacher === teacherName && s.day === today);
    for (const slot of list) {
      const [s, e] = parseRangeToMinutes(slot.time);
      if (minutes >= s && minutes < e) return { slot, day: today };
    }
    return null;
  };

  const getNextClass = (teacherName) => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const list = getClassesOnDay(teacherName, today);
    for (const slot of list) {
      const [s] = parseRangeToMinutes(slot.time);
      if (s > minutes) return { slot, day: today };
    }
    // if none today, find next day's first class
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const idx = dayOrder.indexOf(today);
    for (let k = 1; k < dayOrder.length; k++) {
      const d = dayOrder[(idx + k) % dayOrder.length];
      const first = getFirstClassOnDay(teacherName, d);
      if (first) return { slot: first, day: d };
    }
    return null;
  };

  // ---------- Bot response helpers ----------
  const botReply = async (text) => {
    setBotTyping(true);
    const delay = 350 + Math.floor(Math.random() * 700);
    await new Promise(r => setTimeout(r, delay));
    setChatMessages(prev => [...prev, { from: 'bot', text }]);
    setBotTyping(false);
    setTimeout(() => { messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight); }, 60);
  };

  const answerQuery = async (query) => {
    if (!selectedTeacher) {
      await botReply("Please select your profile first so I can pull your schedule. 🙂");
      return;
    }

    const q = (query || '').toLowerCase().trim();

    // If user asks about a specific day: "How many classes on Monday"
    for (const day of DAYS) {
      if (q.includes(day.toLowerCase()) && (q.includes('how many') || q.includes('number') || q.includes('count') || q.includes('classes'))) {
        const list = getClassesOnDay(selectedTeacher, day);
        if (!list.length) {
          await botReply(`You have no classes on ${day}. Enjoy the free time!`);
        } else {
          await botReply(`You have ${list.length} class${list.length > 1 ? 'es' : ''} on ${day}. Your first is ${list[0].subject} at ${list[0].time} (${list[0].className}).`);
        }
        return;
      }
    }

    // Classes today
    if (q.includes('today')) {
      const today = activeDay;
      const list = getClassesOnDay(selectedTeacher, today);
      if (!list.length) {
        await botReply(`You have no classes today (${today}).`);
        return;
      }
      const lines = [`Today (${today}) you have ${list.length} class${list.length > 1 ? 'es' : ''}:`];
      for (const s of list) lines.push(`• ${s.time} — ${s.subject} (${s.className}, room ${s.room})`);
      await botReply(lines.join('\n'));
      return;
    }

    // What class do I have now?
    if (q.includes('now') || q.includes('current') || q.includes('right now')) {
      const cur = getCurrentClass(selectedTeacher);
      if (cur && cur.slot) {
        const s = cur.slot;
        await botReply(`Right now you are teaching **${s.subject}** to **${s.className}** in ${s.room}. It runs ${s.time}.`);
      } else {
        await botReply("You have no class at this exact moment.");
      }
      return;
    }

    // Next class
    if (q.includes('next') || q.includes('upcoming')) {
      const next = getNextClass(selectedTeacher);
      if (!next) {
        await botReply("No upcoming classes found in the published timetable.");
        return;
      }
      const s = next.slot;
      await botReply(`Your next class is **${s.subject}** with **${s.className}** on ${next.day} at ${s.time} in ${s.room}.`);
      return;
    }

    // First class tomorrow
    if (q.includes('first') && q.includes('tomorrow')) {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayIdx = dayOrder.indexOf(activeDay);
      const tomorrow = dayOrder[(todayIdx + 1) % dayOrder.length];
      const first = getFirstClassOnDay(selectedTeacher, tomorrow);
      if (!first) {
        await botReply(`You have no classes on ${tomorrow}.`);
        return;
      }
      await botReply(`Your first class on ${tomorrow} is **${first.subject}** with ${first.className} at ${first.time} in ${first.room}.`);
      return;
    }

    // Labs this week
    if (q.includes('lab') || q.includes('practical')) {
      const labs = getLabsThisWeek(selectedTeacher);
      if (!labs.length) {
        await botReply("You have no lab/practical sessions scheduled this week.");
        return;
      }
      const lines = ['Your lab/practical sessions this week:'];
      for (const l of labs) lines.push(`• ${l.day} ${l.time} — ${l.subject} (${l.className}, ${l.room})`);
      await botReply(lines.join('\n'));
      return;
    }

    // Break / Lunch
    if (q.includes('break') || q.includes('lunch')) {
      const today = activeDay;
      const has = hasBreakOnDay(selectedTeacher, today);
      if (has) {
        await botReply(`Yes — there is a lunch/break slot on ${today} in your published schedule.`);
      } else {
        await botReply(`No scheduled lunch/break found for ${today}.`);
      }
      return;
    }

    // Full timetable
    if (q.includes('full') || q.includes('timetable') || q.includes('all classes') || q.includes('show')) {
      const week = getClassesThisWeek(selectedTeacher);
      if (!week.length) {
        await botReply("You have no classes in the published timetable.");
        return;
      }
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const summary = dayOrder.map(d => {
        const list = getClassesOnDay(selectedTeacher, d);
        return `${d}: ${list.length} class${list.length !== 1 ? 'es' : ''}`;
      });
      await botReply(`Weekly summary for ${selectedTeacher}:\n${summary.join('\n')}\nTip: ask "show Monday" to list details.`);
      return;
    }

    // Ask by day (fallback)
    for (const day of DAYS) {
      if (q.includes(day.toLowerCase())) {
        const list = getClassesOnDay(selectedTeacher, day);
        if (!list.length) {
          await botReply(`You have no classes on ${day}.`);
        } else {
          const lines = [`${day}: ${list.length} class${list.length > 1 ? 'es' : ''}`];
          list.forEach(s => lines.push(`• ${s.time} — ${s.subject} (${s.className}, ${s.room})`));
          await botReply(lines.join('\n'));
        }
        return;
      }
    }

    // fallback friendly message
    await botReply("Sorry, I didn't catch that. Try asking:\n• How many classes on Monday?\n• What class do I have now?\n• Show my labs this week\n• What is my next class?");
  };

  // send chat (user)
  const sendChat = async () => {
    const text = (chatInput || "").trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { from: 'user', text }]);
    setChatInput('');
    if (!chatOpen) setChatOpen(true);
    await answerQuery(text);
    setTimeout(() => { messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight); }, 60);
  };

  const quickAsk = async (text) => {
    setChatMessages(prev => [...prev, { from: 'user', text }]);
    await answerQuery(text);
  };

  useEffect(() => {
    setTimeout(() => { messagesRef.current?.scrollTo(0, messagesRef.current?.scrollHeight || 0); }, 80);
  }, [chatMessages, botTyping]);

  // Filter logic for the custom dropdown
  const filteredTeachers = teacherList.filter(t =>
    t.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* --- NAVBAR --- */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg text-xl">👩‍🏫</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Faculty<span className="text-indigo-600">Portal</span></h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Instructor Dashboard</p>
          </div>
        </div>
        <div className="flex gap-3">
          {selectedTeacher && (
            <button onClick={() => setSelectedTeacher("")} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              ← Portal Home
            </button>
          )}
          <button onClick={handleLogout} className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-black transition shadow-lg">
            Logout
          </button>
        </div>
      </nav>

      {/* --- CONTENT --- */}
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* STEP 1: SELECTION SCREEN */}
        {!selectedTeacher && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">👋</div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome, Faculty</h2>
              <p className="text-slate-500 mb-8">Please select your profile to view your schedule.</p>

              {loading ? <div className="animate-pulse text-indigo-600 font-bold">Loading Faculty Data...</div> :
                error ? <div className="text-red-500 bg-red-50 p-4 rounded-xl">{error}</div> : (
                  <div className="relative text-left">
                    {/* --- CUSTOM SEARCHABLE DROPDOWN TRIGGER --- */}
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer flex justify-between items-center hover:border-indigo-500 transition"
                    >
                      <span>{selectedTeacher || "Select Your Name"}</span>
                      <span className="text-slate-400">▼</span>
                    </div>

                    {/* --- DROPDOWN LIST WITH SEARCH BAR --- */}
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-64 overflow-hidden flex flex-col">
                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                          <input
                            type="text"
                            placeholder="Search faculty name..."
                            className="w-full p-2 bg-slate-50 rounded-lg outline-none text-sm font-medium border border-transparent focus:border-indigo-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {/* Filtered List */}
                        <div className="overflow-y-auto">
                          {filteredTeachers.length > 0 ? (
                            filteredTeachers.map(t => (
                              <div
                                key={t}
                                onClick={() => {
                                  setSelectedTeacher(t);
                                  setIsDropdownOpen(false);
                                  setSearchTerm("");
                                }}
                                className="px-4 py-3 hover:bg-indigo-50 cursor-pointer text-slate-700 font-medium transition border-b border-slate-50 last:border-0"
                              >
                                {t}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-slate-400 text-sm italic">
                              No faculty found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* STEP 2: DASHBOARD */}
        {selectedTeacher && (
          <div className="animate-fade-in">

            {/* Header Info */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1 block">Instructor Profile</span>
                <h2 className="text-4xl font-black text-slate-900 flex items-center gap-3">
                  {selectedTeacher}
                  <span className="text-lg font-mono font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                    {getTeacherUID(selectedTeacher) || "ID-###"}
                  </span>
                </h2>
              </div>

              {/* Day Tabs */}
              <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                {DAYS.map(day => (
                  <button key={day} onClick={() => setActiveDay(day)} className={`px-6 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeDay === day ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySchedule.length > 0 ? (
                mySchedule.map((slot, i) => (
                  <div key={i} className={`bg-white rounded-2xl p-6 border-l-[6px] shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 ${getCardStyle(slot.className)}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-slate-900 text-white text-xs font-mono py-1 px-2.5 rounded-md">
                        {slot.time}
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                        📍 {slot.room}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black text-slate-800 mb-1">{slot.className}</h3>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">{slot.subject}</p>

                    <div className="pt-4 border-t border-slate-100 flex gap-2">
                      {slot.type === 'practical' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">🔬 LAB SESSION</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">📖 LECTURE</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <div className="text-6xl mb-4 opacity-50 grayscale">☕</div>
                  <h3 className="text-xl font-bold text-slate-400">No classes scheduled</h3>
                  <p className="text-slate-400 text-sm">Enjoy your break on {activeDay}!</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Chatbot Floating Button */}
      <div
        onClick={() => setChatOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl cursor-pointer hover:bg-indigo-700 transition"
        title="Ask timetable bot"
      >
        💬
      </div>

      {/* Chatbot Window */}
      {chatOpen && (
        <div className="fixed bottom-28 right-6 w-96 bg-white rounded-2xl shadow-2xl border p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-bold text-indigo-600">Tima - AI Assistance</div>
              <div className="text-xs text-slate-400">Ask about your teaching schedule — I answer politely.</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setChatMessages([]); setChatInput(''); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
              <button onClick={() => setChatOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            </div>
          </div>

          <div ref={messagesRef} className="h-64 overflow-y-auto bg-slate-50 p-3 rounded-xl mb-3">
            {chatMessages.length === 0 && (
              <div className="text-sm text-slate-500">
                Hi — ask me things like: <br />
                • "What classes do I have today?" <br />
                • "How many classes on Monday?" <br />
                • "What am I teaching now?"
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`my-2 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-3 py-2 rounded-xl ${m.from === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`} style={{ whiteSpace: 'pre-line' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {botTyping && (
              <div className="my-2 text-left">
                <div className="inline-block px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                  typing...
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => quickAsk('How many classes today?')} className="px-3 py-1 text-xs bg-white border rounded-full">Classes today</button>
            <button onClick={() => quickAsk('What am I teaching now?')} className="px-3 py-1 text-xs bg-white border rounded-full">What now?</button>
            <button onClick={() => quickAsk('Next class?')} className="px-3 py-1 text-xs bg-white border rounded-full">Next class</button>
            <button onClick={() => quickAsk('Show my labs this week')} className="px-3 py-1 text-xs bg-white border rounded-full">Labs</button>
            <button onClick={() => quickAsk('Show my full timetable')} className="px-3 py-1 text-xs bg-white border rounded-full">Full timetable</button>
          </div>

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
              placeholder={selectedTeacher ? "Ask me about your schedule..." : "Select your profile first..."}
              className="flex-1 p-2 border rounded-xl outline-none"
            />
            <button onClick={sendChat} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">➤</button>
          </div>
        </div>
      )}

      <style>{`.animate-fade-in-up{animation:u 0.6s ease-out}.animate-fade-in{animation:f 0.4s ease-out}@keyframes u{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes f{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

export default TeacherPortal;