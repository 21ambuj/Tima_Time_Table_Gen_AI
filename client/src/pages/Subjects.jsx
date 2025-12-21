import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({
    name: '',
    code: '',
    credits: 3,
    type: 'theory',
    department: 'General'
  });
  const [editId, setEditId] = useState(null);

  // BULK UPLOAD STATE
  const [activeTab, setActiveTab] = useState('manual');
  const [csvFile, setCsvFile] = useState(null);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/subjects');
      setSubjects(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, credits: Number(form.credits) };
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/subjects/${editId}`, payload);
        alert("✅ Subject Updated!");
      } else {
        await axios.post('http://localhost:5000/api/subjects', payload);
        alert("✅ Subject Added!");
      }
      setForm({ name: '', code: '', credits: 3, type: 'theory', department: 'General' });
      setEditId(null);
      fetchSubjects();
    } catch (err) { alert("Error saving subject"); }
  };

  // --- CSV PARSER LOGIC ---
  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert("Please select a CSV file.");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split(/\r?\n/);
      const subjectsData = [];

      rows.forEach(rowString => {
        if (!rowString.trim()) return;
        const row = rowString.split(',');

        // CSV Format: Name, Code, Credits, Type, Dept
        if (row.length >= 2 && row[0].trim() !== '') {
          const name = row[0].trim();
          const code = row[1].trim();
          const credits = row[2] ? parseInt(row[2].trim()) : 3;
          const type = row[3] ? row[3].trim().toLowerCase() : 'theory';
          const department = row[4] ? row[4].trim() : 'General';

          if (name && code) subjectsData.push({ name, code, credits, type, department });
        }
      });

      if (subjectsData.length === 0) return alert("No valid data found in CSV.");

      try {
        const res = await axios.post('http://localhost:5000/api/subjects/bulk', subjectsData);
        alert(res.data.message);
        setCsvFile(null);
        fetchSubjects();
      } catch (err) { alert("Upload Failed: " + err.response?.data?.message); }
    };
    reader.readAsText(csvFile);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/subjects/${id}`);
      fetchSubjects();
    } catch (err) { alert("Error deleting subject"); }
  };

  const handleEdit = (s) => {
    setForm({
      name: s.name,
      code: s.code,
      credits: s.credits,
      type: s.type,
      department: s.department
    });
    setEditId(s._id);
    setActiveTab('manual');
  };

  const deleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will delete ALL subjects. This action cannot be undone.")) return;
    try {
      await axios.delete('http://localhost:5000/api/subjects');
      setSubjects([]);
      alert("All subjects deleted.");
    } catch (err) {
      alert("Delete failed.");
    }
  };

  return (
    // MAIN CONTAINER: Fixed Screen Height
    <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden selection:bg-cyan-100 selection:text-cyan-800">

      {/* --- HEADER --- */}
      <div className="flex-none bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm z-20">
        <div className="animate-fade-in-down">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Subject Manager
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Curriculum & Credits
          </p>
        </div>
        <Link to="/admin" className="px-5 py-2 text-sm font-bold text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 hover:text-cyan-600 transition-all">
          ← Dashboard
        </Link>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">

        {/* LEFT PANEL: FORM (Fixed Width ~35%) */}
        <div className="w-[35%] min-w-[350px] flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in-left">

          {/* Tabs Header */}
          <div className="flex-none flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'manual' ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              ✏️ Manual
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'bulk' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              📂 Import
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
            {/* Decorative Top Line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${editId ? 'bg-amber-500' : activeTab === 'manual' ? 'bg-cyan-500' : 'bg-blue-500'}`}></div>

            {activeTab === 'manual' ? (
              // --- MANUAL FORM ---
              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-lg font-black ${editId ? 'text-amber-600' : 'text-gray-800'}`}>
                    {editId ? '✏️ Update Course' : '📘 New Course'}
                  </h2>
                  {editId && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold">Editing</span>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="group col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Subject Name</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-50 outline-none transition-all font-bold text-gray-700"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="group">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Code</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-50 outline-none transition-all font-mono text-sm"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      required
                    />
                  </div>

                  <div className="group">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Credits</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-50 outline-none transition-all"
                      value={form.credits}
                      onChange={e => setForm({ ...form, credits: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE, Mechanical, General"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-50 outline-none transition-all"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    required
                  />
                </div>

                {/* Visual Type Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Session Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'theory' })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${form.type === 'theory' ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                    >
                      <span className="text-2xl">📖</span>
                      <span className="font-bold text-sm">Theory</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'practical' })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${form.type === 'practical' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                    >
                      <span className="text-2xl">🔬</span>
                      <span className="font-bold text-sm">Practical</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-lg shadow-md hover:scale-[1.02] transition-transform ${editId ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-cyan-600 to-blue-600'}`}>
                    {editId ? 'Update Subject' : 'Save Subject'}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      onClick={() => { setForm({ name: '', code: '', credits: 3, type: 'theory', department: 'General' }); setEditId(null) }}
                      className="px-4 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </form>
            ) : (
              // --- BULK IMPORT FORM ---
              <div className="animate-fade-in flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-black text-blue-700">📤 Bulk Upload</h2>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 mb-5 shadow-inner">
                  <p className="text-xs font-bold text-indigo-800 uppercase mb-2 border-b border-indigo-200 pb-1">
                    CSV Format Required
                  </p>
                  <code className="bg-white px-2 py-1 rounded border border-indigo-200 text-[10px] font-mono block mb-2 text-indigo-900">
                    Name, Code, Credits, Type, Dept
                  </code>
                  <ul className="text-[11px] text-indigo-700 space-y-1 list-disc pl-4 opacity-80">
                    <li><strong>Type:</strong> 'theory' or 'practical'</li>
                    <li><strong>Dept:</strong> e.g., CSE, IT (Optional, default: General)</li>
                  </ul>
                  <div className="mt-3 bg-slate-800 text-gray-300 text-[10px] font-mono p-2 rounded border border-slate-600">
                    Mathematics, MTH101, 4, theory, Science<br />
                    Physics Lab, PHY101L, 1, practical, Science
                  </div>
                </div>

                <form onSubmit={handleBulkSubmit} className="space-y-4 mt-auto">
                  <label className="block w-full cursor-pointer group">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center group-hover:border-blue-500 group-hover:bg-blue-50 transition-all">
                      <span className="text-3xl block mb-2 group-hover:scale-110 transition">📄</span>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-blue-600">
                        {csvFile ? csvFile.name : "Select CSV File"}
                      </span>
                    </div>
                    <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
                  </label>

                  <button type="submit" className="w-full py-3 text-white font-bold rounded-lg shadow-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-lg hover:scale-[1.02] transition-all">
                    Process Upload
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: LIST (Fills Remaining Width) */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in-right">
          {/* List Header */}
          <div className="flex-none p-5 border-b border-gray-100 bg-white/80 backdrop-blur z-10 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Course List</h2>
              <p className="text-xs text-gray-400">Total Subjects: {subjects.length}</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={deleteAll}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition text-sm"
              >
                ⚠️ Delete All
              </button>
              <div className="h-8 w-8 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center font-bold text-xs">
                {subjects.length}
              </div>
            </div>
          </div>

          {/* Scrollable List Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 p-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {subjects.length === 0 && (
                <div className="col-span-full text-center text-gray-400 mt-20 flex flex-col items-center opacity-50">
                  <span className="text-4xl mb-2">📚</span>
                  <span className="italic">No subjects added yet.</span>
                </div>
              )}

              {subjects.map((s, i) => (
                <div key={s._id}
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all flex flex-col justify-between group relative overflow-hidden"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Side Color Bar */}
                  <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${s.type === 'practical' ? 'bg-green-400' : 'bg-blue-400'}`}></div>

                  <div>
                    <div className="flex justify-between items-start mb-1 pl-2">
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">{s.name}</h3>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 font-bold">
                        {s.code}
                      </span>
                    </div>

                    <div className="pl-2 flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] font-bold bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-200 uppercase tracking-wide">
                        {s.department || "General"}
                      </span>
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100">
                        Credits: {s.credits}
                      </span>
                      {s.type === 'practical' ? (
                        <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded font-bold border border-green-100 flex items-center gap-1">
                          <span>🔬</span> Practical
                        </span>
                      ) : (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold border border-blue-100 flex items-center gap-1">
                          <span>📖</span> Theory
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pl-2 mt-5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(s)} className="flex-1 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 rounded hover:bg-amber-100 transition">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s._id)} className="flex-1 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition">
                      Delete
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

export default Subjects;