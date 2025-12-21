import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function StudentPortal() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState([]);
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedClass, setSelectedClass] = useState("");
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

    axios.get('http://localhost:5000/api/timetable')
      .then(res => {
        const data = res.data || [];
        if (data.length === 0) setError("No schedule published yet.");
        setAllData(data);
        const classes = [...new Set(data.map(i => i.className))].filter(Boolean).sort();
        setClassList(classes);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Connection failed.");
        setLoading(false);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // robust time parser -> minutes since midnight for start time
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    try {
      // format "09:00 AM - 10:00 AM"
      const startPart = timeStr.split('-')[0].trim();
      const parts = startPart.split(' ');
      const hm = parts[0].split(':');
      let hh = parseInt(hm[0], 10);
      const mm = parseInt(hm[1] || '0', 10);
      const ampm = (parts[1] || '').toUpperCase();
      if (ampm === 'PM' && hh !== 12) hh += 12;
      if (ampm === 'AM' && hh === 12) hh = 0;
      return hh * 60 + (mm || 0);
    } catch (e) {
      const nums = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (nums) return parseInt(nums[1], 10) * 60 + parseInt(nums[2], 10);
      return 0;
    }
  };

  // parse both start & end minutes from "09:00 AM - 10:00 AM"
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

  // sorted day schedule (by start time)
  const daySchedule = allData
    .filter(i => i.className === selectedClass && i.day === activeDay)
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  const getCardStyle = (subject, type) => {
    if (type === 'Break') return 'border-l-amber-400 bg-amber-50/50';
    const colors = [
      'border-l-cyan-500 shadow-cyan-100',
      'border-l-purple-500 shadow-purple-100',
      'border-l-pink-500 shadow-pink-100',
      'border-l-blue-500 shadow-blue-100',
      'border-l-teal-500 shadow-teal-100'
    ];
    let hash = 0;
    const s = subject || '';
    for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // ---------- Bot logic helpers ----------

  const getClassesOnDay = (cls, day) => {
    return allData
      .filter(s => s.className === cls && s.day === day)
      .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  };

  const getFirstClassOnDay = (cls, day) => {
    const list = getClassesOnDay(cls, day);
    return list.length ? list[0] : null;
  };

  const getClassesThisWeek = (cls) => {
    return allData
      .filter(s => s.className === cls)
      .sort((a, b) => {
        const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
        if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      });
  };

  const getLabsThisWeek = (cls) => {
    return getClassesThisWeek(cls).filter(s => (s.type || '').toLowerCase() === 'practical' || (s.type || '').toLowerCase() === 'lab');
  };

  const hasBreakOnDay = (cls, day) => {
    return getClassesOnDay(cls, day).some(s => (s.type || '').toLowerCase() === 'break' || (s.subject || '').toLowerCase().includes('lunch'));
  };

  const getCurrentClass = (cls) => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const list = allData.filter(s => s.className === cls && s.day === today);
    for (const slot of list) {
      const [s, e] = parseRangeToMinutes(slot.time);
      if (minutes >= s && minutes < e) return { slot, day: today };
    }
    return null;
  };

  const getNextClass = (cls) => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const list = getClassesOnDay(cls, today);
    for (const slot of list) {
      const [s] = parseRangeToMinutes(slot.time);
      if (s > minutes) return { slot, day: today };
    }
    // if none today, find next day's first class
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const idx = dayOrder.indexOf(today);
    for (let k = 1; k < dayOrder.length; k++) {
      const d = dayOrder[(idx + k) % dayOrder.length];
      const first = getFirstClassOnDay(cls, d);
      if (first) return { slot: first, day: d };
    }
    return null;
  };

  // very small typing delay to look natural
  const botReply = async (text) => {
    setBotTyping(true);
    // small human-like delay (400-1100ms)
    const delay = 400 + Math.floor(Math.random() * 700);
    await new Promise(r => setTimeout(r, delay));
    setChatMessages(prev => [...prev, { from: 'bot', text }]);
    setBotTyping(false);
    // scroll to bottom
    setTimeout(() => { messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight); }, 50);
  };

  const answerQuery = async (query) => {
    if (!selectedClass) {
      await botReply("Hi, I am Tima your Time Table Assistant. Please select your class section first — I’ll use that to fetch your timetable.");
      return;
    }

    const q = (query || '').toLowerCase().trim();

    // direct matches / quick intents
    if (q.match(/\bclasses?\b.*\bon\b.*(monday|tuesday|wednesday|thursday|friday|saturday)/) || q.match(/\bhow many classes\b/)) {
      // find day name in query
      const found = DAYS.find(d => q.includes(d.toLowerCase()));
      const day = found || activeDay;
      const list = getClassesOnDay(selectedClass, day);
      if (!list.length) {
        await botReply(`Good news — you have no classes on ${day}.`);
        return;
      }
      const first = list[0];
      await botReply(`You have ${list.length} class${list.length > 1 ? 'es' : ''} on ${day}. Your first class is **${first.subject}** at ${first.time} (${first.room}).`);
      return;
    }

    if (q.includes('today')) {
      const today = activeDay;
      const list = getClassesOnDay(selectedClass, today);
      if (!list.length) {
        await botReply(`You have no classes today (${today}). Enjoy your free time! 🎉`);
        return;
      }
      const lines = [
        `You have ${list.length} class${list.length > 1 ? 'es' : ''} today (${today}):`
      ];
      for (const s of list) lines.push(`• ${s.time} — ${s.subject} (${s.room})`);
      await botReply(lines.join('\n'));
      return;
    }

    if (q.includes('now') || q.includes('current')) {
      const cur = getCurrentClass(selectedClass);
      if (cur && cur.slot) {
        const s = cur.slot;
        await botReply(`Right now you have **${s.subject}** (${s.type || 'Lecture'}) in ${s.room}. It runs ${s.time}.`);
      } else {
        await botReply("You have no class right now.");
      }
      return;
    }

    if (q.includes('first class') && q.includes('tomorrow')) {
      // compute tomorrow
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayIdx = dayOrder.indexOf(activeDay);
      const tomorrow = dayOrder[(todayIdx + 1) % dayOrder.length];
      const first = getFirstClassOnDay(selectedClass, tomorrow);
      if (!first) {
        await botReply(`You have no classes on ${tomorrow}.`);
        return;
      }
      await botReply(`Your first class on ${tomorrow} is **${first.subject}** at ${first.time} in ${first.room}.`);
      return;
    }

    if (q.includes('labs') || q.includes('practical')) {
      const labs = getLabsThisWeek(selectedClass);
      if (!labs.length) {
        await botReply("You have no lab/practical sessions this week.");
        return;
      }
      const lines = ['Here are your lab sessions this week:'];
      for (const l of labs) lines.push(`• ${l.day} ${l.time} — ${l.subject} (${l.room})`);
      await botReply(lines.join('\n'));
      return;
    }

    if (q.includes('break') || q.includes('lunch')) {
      const hasToday = hasBreakOnDay(selectedClass, activeDay);
      if (hasToday) {
        await botReply("Yes — there is a reserved lunch/break time today. It will be shown as an empty/blocked slot in your timetable.");
      } else {
        await botReply("No scheduled lunch/break appears on today's published timetable.");
      }
      return;
    }

    if (q.includes('full') || q.includes('timetable') || q.includes('schedule') || q.includes('show all')) {
      // present compact summary
      const week = getClassesThisWeek(selectedClass);
      if (!week.length) {
        await botReply("Your timetable is empty.");
        return;
      }
      // build brief summary by day with counts
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const summary = dayOrder.map(d => {
        const list = getClassesOnDay(selectedClass, d);
        return `${d}: ${list.length} class${list.length !== 1 ? 'es' : ''}`;
      });
      await botReply(`Here is a quick weekly summary:\n${summary.join('\n')}\nTip: ask "show Monday" to list details.`);
      return;
    }

    // small fallback: try detect day+intent
    for (const day of DAYS) {
      if (q.includes(day.toLowerCase())) {
        const list = getClassesOnDay(selectedClass, day);
        if (!list.length) {
          await botReply(`You have no classes on ${day}.`);
        } else {
          const lines = [`${day}: ${list.length} class${list.length > 1 ? 'es' : ''}`];
          list.forEach(s => lines.push(`• ${s.time} — ${s.subject} (${s.room})`));
          await botReply(lines.join('\n'));
        }
        return;
      }
    }

    // fallback friendly message
    await botReply("Sorry — I didn't quite catch that. Try questions like:\n• How many classes on Monday?\n• What class do I have now?\n• What is my first class tomorrow?\n• Show my labs this week\nI can fetch details from the published timetable.");
  };

  // send chat (user)
  const sendChat = async () => {
    const text = (chatInput || "").trim();
    if (!text) return;
    setChatMessages(prev => [...prev, { from: 'user', text }]);
    setChatInput('');
    // auto-open chat window if closed
    if (!chatOpen) setChatOpen(true);
    // handle answer
    await answerQuery(text);
    // scroll
    setTimeout(() => { messagesRef.current?.scrollTo(0, messagesRef.current.scrollHeight); }, 50);
  };

  // quick suggestion buttons
  const quickAsk = async (text) => {
    setChatMessages(prev => [...prev, { from: 'user', text }]);
    await answerQuery(text);
  };

  // auto-scroll when chatMessages change
  useEffect(() => {
    setTimeout(() => { messagesRef.current?.scrollTo(0, messagesRef.current?.scrollHeight || 0); }, 80);
  }, [chatMessages, botTyping]);

  // Filter logic for the custom dropdown
  const filteredClasses = classList.filter(c =>
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative">

      {/* NAVBAR */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-600 text-white p-2 rounded-lg text-xl">🎓</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student<span className="text-cyan-600">Portal</span></h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Class Schedule</p>
          </div>
        </div>
        <div className="flex gap-3">
          {selectedClass && (
            <button onClick={() => setSelectedClass("")} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition">
              ← Portal Home
            </button>
          )}
          <button onClick={handleLogout} className="px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-black transition shadow-lg">
            Logout
          </button>
        </div>
      </nav>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* STEP 1: CLASS SELECT */}
        {!selectedClass && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full text-center">
              <div className="w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🎒</div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome, Student</h2>
              <p className="text-slate-500 mb-8">Select your class section to view the weekly schedule.</p>

              {loading ? <div className="animate-pulse text-cyan-600 font-bold">Loading...</div> :
                error ? <div className="text-red-500 bg-red-50 p-4 rounded-xl">{error}</div> : (
                  <div className="relative text-left">
                    {/* --- CUSTOM SEARCHABLE DROPDOWN TRIGGER --- */}
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer flex justify-between items-center hover:border-cyan-500 transition"
                    >
                      <span>{selectedClass || "Select Your Class"}</span>
                      <span className="text-slate-400">▼</span>
                    </div>

                    {/* --- DROPDOWN LIST WITH SEARCH BAR --- */}
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-64 overflow-hidden flex flex-col">
                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                          <input
                            type="text"
                            placeholder="Search section..."
                            className="w-full p-2 bg-slate-50 rounded-lg outline-none text-sm font-medium border border-transparent focus:border-cyan-500 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {/* Filtered List */}
                        <div className="overflow-y-auto">
                          {filteredClasses.length > 0 ? (
                            filteredClasses.map(c => (
                              <div
                                key={c}
                                onClick={() => {
                                  setSelectedClass(c);
                                  setIsDropdownOpen(false);
                                  setSearchTerm("");
                                }}
                                className="px-4 py-3 hover:bg-cyan-50 cursor-pointer text-slate-700 font-medium transition border-b border-slate-50 last:border-0"
                              >
                                {c}
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-slate-400 text-sm italic">
                              No section found
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

        {/* STEP 2: SCHEDULE */}
        {selectedClass && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
              <div>
                <span className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-1 block">Your Class</span>
                <h2 className="text-4xl font-black text-slate-900">{selectedClass}</h2>
              </div>
              <div className="flex bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                {DAYS.map(day => (
                  <button key={day} onClick={() => setActiveDay(day)} className={`px-6 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap ${activeDay === day ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {daySchedule.length > 0 ? (
                daySchedule.map((slot, i) => (
                  <div key={i} className={`bg-white rounded-2xl p-6 border-l-[6px] shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 ${getCardStyle(slot.subject, slot.type)}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-slate-800 text-white text-xs font-mono py-1 px-2.5 rounded-md">{slot.time}</span>
                      {slot.type === 'practical' && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">LAB</span>}
                    </div>
                    <h3 className="text-xl font-black text-slate-800 mb-1">{slot.subject}</h3>
                    {slot.type === 'Break' ? (
                      <div className="mt-4 text-amber-600 font-bold italic text-sm">☕ Refreshment Break</div>
                    ) : (
                      <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <span className="text-base">👨‍🏫</span> {slot.teacher}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <span className="text-base">📍</span> {slot.room}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <div className="text-6xl mb-4 opacity-50 grayscale">🎮</div>
                  <h3 className="text-xl font-bold text-slate-400">No classes</h3>
                  <p className="text-slate-400 text-sm">Enjoy your day off!</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chatbot Floating Button */}
      <div
        onClick={() => setChatOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 bg-cyan-600 text-white w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl cursor-pointer hover:bg-cyan-700 transition"
        title="Ask timetable bot"
      >
        💬
      </div>

      {/* Chatbot Window */}
      {chatOpen && (
        <div className="fixed bottom-28 right-6 w-96 bg-white rounded-2xl shadow-2xl border p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-lg font-bold text-cyan-600">Tima - AI Assistant</div>
              <div className="text-xs text-slate-400">Ask about your classes — I answer politely.</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setChatMessages([]); setChatInput(''); }} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
              <button onClick={() => setChatOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
            </div>
          </div>

          <div ref={messagesRef} className="h-64 overflow-y-auto bg-slate-50 p-3 rounded-xl mb-3">
            {chatMessages.length === 0 && (
              <div className="text-sm text-slate-500">
                Hi — I can answer things like: <br />
                • "How many classes on Monday?" <br />
                • "What class do I have now?" <br />
                • "Show my labs this week"
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`my-2 ${m.from === 'user' ? 'text-right' : 'text-left'}`}>
                <div className={`inline-block px-3 py-2 rounded-xl ${m.from === 'user' ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`} style={{ whiteSpace: 'pre-line' }}>
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
            <button onClick={() => quickAsk('What class do I have now?')} className="px-3 py-1 text-xs bg-white border rounded-full">What now?</button>
            <button onClick={() => quickAsk('First class tomorrow?')} className="px-3 py-1 text-xs bg-white border rounded-full">First tomorrow</button>
            <button onClick={() => quickAsk('Show my labs this week')} className="px-3 py-1 text-xs bg-white border rounded-full">Labs</button>
            <button onClick={() => quickAsk('Show full timetable')} className="px-3 py-1 text-xs bg-white border rounded-full">Full timetable</button>
          </div>

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
              placeholder={selectedClass ? "Ask me about your schedule..." : "Select your class first..."}
              className="flex-1 p-2 border rounded-xl outline-none"
            />
            <button onClick={sendChat} className="px-4 py-2 bg-cyan-600 text-white rounded-xl">➤</button>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in-up{animation:u 0.6s ease-out}
        .animate-fade-in{animation:f 0.4s ease-out}
        @keyframes u{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes f{from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
  );
}

export default StudentPortal;