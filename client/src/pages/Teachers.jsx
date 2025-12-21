import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', department: 'General', qualifiedSubjects: [] });
  const [editId, setEditId] = useState(null);

  // BULK UPLOAD STATE
  const [activeTab, setActiveTab] = useState('manual');
  const [csvFile, setCsvFile] = useState(null);

  const fetchData = async () => {
    try {
      // IMPORTANT: withCredentials: true is required for Multi-Admin (School ID) support
      const [tRes, sRes] = await Promise.all([
        axios.get('http://localhost:5000/api/teachers', { withCredentials: true }),
        axios.get('http://localhost:5000/api/subjects', { withCredentials: true })
      ]);
      setTeachers(tRes.data);
      setAllSubjects(sRes.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/teachers/${editId}`, form, { withCredentials: true });
        alert("✅ Teacher Updated!");
      } else {
        await axios.post('http://localhost:5000/api/teachers', form, { withCredentials: true });
        alert("✅ Teacher Added!");
      }
      setForm({ name: '', email: '', department: 'General', qualifiedSubjects: [] });
      setEditId(null);
      fetchData();
    } catch (err) {
      // Handle specific error for duplicates (e.g. email exists in THIS school)
      const msg = err.response?.data?.error || err.response?.data?.message || "Error saving teacher";
      alert(`❌ ${msg}`);
    }
  };

  // --- CSV PARSER LOGIC ---
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert("Please select a CSV file first.");

    const reader = new FileReader();

    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split(/\r?\n/);
      const teachersData = [];

      rows.forEach(rowString => {
        if (!rowString.trim()) return;
        const cols = rowString.split(',');

        // Format: Name, Email, Dept, Subject1, Subject2...
        if (cols.length >= 3) {
          const name = cols[0].trim();
          const email = cols[1].trim();
          const department = cols[2].trim();

          let subjectIds = [];
          for (let i = 3; i < cols.length; i++) {
            const subjName = cols[i]?.trim();
            if (subjName) {
              // Fuzzy Match (Case Insensitive)
              const matched = allSubjects.find(s =>
                s.name.toLowerCase() === subjName.toLowerCase() ||
                s.code.toLowerCase() === subjName.toLowerCase()
              );
              if (matched) subjectIds.push(matched._id);
            }
          }

          if (name && email) {
            teachersData.push({ name, email, department, qualifiedSubjects: subjectIds });
          }
        }
      });

      if (teachersData.length === 0) return alert("No valid data found in CSV.");

      try {
        // Send credentials so backend knows which school to upload to
        const res = await axios.post('http://localhost:5000/api/teachers/bulk', teachersData, { withCredentials: true });
        alert(res.data.message);
        setCsvFile(null);
        fetchData();
      } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.message || err.message;
        alert("❌ Bulk Upload Failed: " + msg);
      }
    };

    reader.readAsText(csvFile);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this teacher?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/teachers/${id}`, { withCredentials: true });
      fetchData();
    } catch (err) { alert("Error deleting teacher"); }
  };

  const handleEdit = (t) => {
    setForm({
      name: t.name,
      email: t.email,
      department: t.department || 'General',
      qualifiedSubjects: t.qualifiedSubjects ? t.qualifiedSubjects.map(s => s._id || s) : []
    });
    setEditId(t._id);
    setActiveTab('manual');
  };

  const deleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will delete ALL teachers. This action cannot be undone.")) return;
    try {
      await axios.delete('http://localhost:5000/api/teachers', { withCredentials: true });
      setTeachers([]);
      alert("All teachers deleted.");
    } catch (err) {
      alert("Delete failed.");
    }
  };

  return (
    // MAIN CONTAINER: Fixed Screen Height (No Page Scroll)
    <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-800">

      {/* --- HEADER --- */}
      <div className="flex-none bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm z-20">
        <div className="animate-fade-in-down">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Faculty Manager
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Staff & Subject Assignments
          </p>
        </div>
        <Link to="/admin" className="px-5 py-2 text-sm font-bold text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 hover:text-indigo-600 transition-all">
          ← Dashboard
        </Link>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">

        {/* LEFT PANEL: FORM (Fixed Width ~35% - NO SCROLLBAR) */}
        <div className="w-[35%] min-w-[350px] flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 animate-slide-in-left">

          {/* Tabs Header */}
          <div className="flex-none flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'manual' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              ✏️ Manual
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'bulk' ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              📂 Import
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 p-5 relative flex flex-col justify-center">
            <div className={`absolute top-0 left-0 w-full h-1 ${editId ? 'bg-amber-500' : activeTab === 'manual' ? 'bg-indigo-500' : 'bg-pink-500'}`}></div>

            {activeTab === 'manual' ? (
              // --- MANUAL FORM ---
              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-lg font-black ${editId ? 'text-amber-600' : 'text-indigo-900'}`}>
                    {editId ? '🔄 Update Profile' : '✨ New Faculty'}
                  </h2>
                  {editId && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">Editing</span>}
                </div>

                <div className="group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Full Name</label>
                  <input
                    type="text"
                    placeholder="Dr. John Doe"
                    className="w-full bg-gray-50 p-2.5 rounded-xl border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-bold text-gray-700 text-sm"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="email@college.edu"
                    className="w-full bg-gray-50 p-2.5 rounded-xl border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium text-gray-700 text-sm"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>

                <div className="group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE"
                    className="w-full bg-gray-50 p-2.5 rounded-xl border border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-medium text-gray-700 text-sm"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Qualified Subjects</label>
                  <div className="relative">
                    <select
                      multiple
                      className="w-full bg-gray-50 p-2 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 h-32 outline-none text-xs text-gray-700 font-medium custom-scrollbar"
                      value={form.qualifiedSubjects}
                      onChange={(e) => {
                        const values = [...e.target.selectedOptions].map(o => o.value);
                        setForm({ ...form, qualifiedSubjects: values });
                      }}
                    >
                      {allSubjects.map(sub => (
                        <option key={sub._id} value={sub._id} className="p-1.5 hover:bg-indigo-100 rounded-lg cursor-pointer mb-1">
                          {sub.name} ({sub.code})
                        </option>
                      ))}
                    </select>
                    <div className="absolute bottom-2 right-3 text-[10px] text-gray-400 pointer-events-none bg-white/80 px-2 rounded">
                      Hold Ctrl/Cmd to select
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 ${editId ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                    {editId ? 'Update Data' : 'Save Faculty'}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      onClick={() => { setForm({ name: '', email: '', department: 'General', qualifiedSubjects: [] }); setEditId(null) }}
                      className="px-4 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </form>
            ) : (
              // --- BULK IMPORT FORM ---
              <div className="animate-fade-in flex flex-col h-full justify-center">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-black text-pink-700">📤 Bulk Import</h2>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-5 shadow-inner">
                  <p className="text-xs font-bold text-indigo-800 uppercase mb-2 border-b border-indigo-200 pb-1">
                    CSV Format Required
                  </p>
                  <code className="bg-white px-2 py-1 rounded border border-indigo-200 text-[10px] font-mono block mb-2 text-indigo-900">
                    Name, Email, Dept, Subject1, Subject2...
                  </code>
                  <div className="mt-3 bg-slate-800 text-gray-300 text-[10px] font-mono p-2 rounded border border-slate-600">
                    John Doe, john@test.com, CSE, Math<br />
                    Jane Smith, jane@test.com, IT, Chemistry
                  </div>
                </div>

                <form onSubmit={handleBulkSubmit} className="space-y-4 mt-auto">
                  <label className="block w-full cursor-pointer group">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center group-hover:border-pink-500 group-hover:bg-pink-50 transition-all">
                      <span className="text-3xl block mb-2 group-hover:scale-110 transition">📄</span>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-pink-600">
                        {csvFile ? csvFile.name : "Select CSV File"}
                      </span>
                    </div>
                    <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
                  </label>

                  <button type="submit" className="w-full py-3 text-white font-bold rounded-xl shadow-lg bg-gradient-to-r from-pink-500 to-rose-600 hover:shadow-xl hover:scale-[1.02] transition-all">
                    Upload & Process
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: LIST */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in-right">
          <div className="flex-none p-5 border-b border-gray-100 bg-white/80 backdrop-blur z-10 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Faculty List</h2>
              <p className="text-xs text-gray-400">Total Members: {teachers.length}</p>
            </div>
            <div className="flex gap-2 items-center"> {/* Added flex container for buttons */}
              <button
                onClick={deleteAll}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition text-sm"
              >
                ⚠️ Delete All
              </button>
              <div className="h-8 w-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                {teachers.length}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 p-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {teachers.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                  <span className="text-5xl mb-3">👨‍🏫</span>
                  <p className="text-gray-500 font-bold">No teachers found</p>
                </div>
              )}

              {teachers.map((t, i) => (
                <div key={t._id}
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-inner border border-white">
                        {t.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-indigo-700 transition-colors">{t.name}</h3>
                          <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{t.department}</span>
                        </div>
                        <p className="text-xs text-gray-400 font-medium">{t.email}</p>
                      </div>
                    </div>

                    <div className="mt-4 pl-12 flex flex-wrap gap-1.5">
                      {t.qualifiedSubjects?.map((sub, idx) => (
                        <span key={idx} className="bg-white border border-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-md shadow-sm group-hover:border-indigo-200 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                          {sub.name}
                        </span>
                      ))}
                      {(!t.qualifiedSubjects || t.qualifiedSubjects.length === 0) && (
                        <span className="text-[10px] text-gray-300 italic">No subjects assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pl-12 mt-auto opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(t)} className="flex-1 py-2 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition flex items-center justify-center gap-1">
                      <span>✏️</span> Edit
                    </button>
                    <button onClick={() => handleDelete(t._id)} className="flex-1 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1">
                      <span>🗑️</span> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Global Styles for Scrollbar & Animation */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d1d5db; }
        
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .animate-fade-in-down { animation: fadeInDown 0.6s ease-out forwards; }
        .animate-slide-in-left { animation: slideInLeft 0.5s ease-out forwards; }
        .animate-slide-in-right { animation: slideInRight 0.5s ease-out forwards; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default Teachers;