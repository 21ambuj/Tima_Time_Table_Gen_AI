import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Classrooms() {
  const [rooms, setRooms] = useState([]);
  const [form, setForm] = useState({ name: '', capacity: 60, type: 'LectureHall', department: 'General' });
  const [editId, setEditId] = useState(null);

  // UI States
  const [activeTab, setActiveTab] = useState('manual');
  const [csvFile, setCsvFile] = useState(null);

  const fetchRooms = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/classrooms');
      setRooms(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, capacity: Number(form.capacity) };
    try {
      if (editId) {
        await axios.put(`http://localhost:5000/api/classrooms/${editId}`, payload);
        alert("✅ Room Updated!");
      } else {
        await axios.post('http://localhost:5000/api/classrooms', payload);
        alert("✅ Room Added!");
      }
      setForm({ name: '', capacity: 60, type: 'LectureHall', department: 'General' });
      setEditId(null);
      fetchRooms();
    } catch (err) { alert("Error saving room"); }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!csvFile) return alert("Please select a CSV file.");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split(/\r?\n/);
      const roomsData = [];

      rows.forEach(rowString => {
        if (!rowString.trim()) return;
        const col = rowString.split(',');

        if (col.length >= 2) {
          const name = col[0].trim();
          const capacity = col[1].trim();
          const type = col[2] ? col[2].trim() : 'LectureHall';
          const department = col[3] ? col[3].trim() : 'General';

          if (name && capacity) {
            roomsData.push({ name, capacity, type, department });
          }
        }
      });

      if (roomsData.length === 0) return alert("No valid data found.");

      try {
        const res = await axios.post('http://localhost:5000/api/classrooms/bulk', roomsData);
        alert(res.data.message);
        setCsvFile(null);
        fetchRooms();
      } catch (err) { alert("Upload Failed: " + err.response?.data?.message); }
    };
    reader.readAsText(csvFile);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this room?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/classrooms/${id}`);
      fetchRooms();
    } catch (err) { alert("Error deleting room"); }
  };

  const handleEdit = (r) => {
    setForm({
      name: r.name,
      capacity: r.capacity,
      type: r.type,
      department: r.department
    });
    setEditId(r._id);
    setActiveTab('manual');
  };

  const deleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will delete ALL classrooms. This action cannot be undone.")) return;
    try {
      await axios.delete('http://localhost:5000/api/classrooms', { withCredentials: true });
      setRooms([]);
      alert("All classrooms deleted.");
    } catch (err) {
      alert("Delete failed.");
    }
  };

  return (
    // MAIN CONTAINER: Fixed Screen Height (No Body Scroll)
    <div className="h-screen w-screen bg-gray-50 flex flex-col font-sans overflow-hidden selection:bg-orange-100 selection:text-orange-800">

      {/* --- HEADER --- */}
      <div className="flex-none bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm z-20">
        <div className="animate-fade-in-down">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 bg-clip-text text-transparent">
            Classroom Manager
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Infrastructure & Capacity
          </p>
        </div>

        <Link to="/admin" className="px-5 py-2 text-sm font-bold text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 hover:text-orange-600 transition-all">
          ← Dashboard
        </Link>
      </div>

      {/* --- CONTENT AREA (Fills remaining space) --- */}
      <div className="flex-1 flex gap-6 p-6 overflow-hidden">

        {/* LEFT PANEL: FORM (Fixed Width ~35%, Internally Scrollable) */}
        <div className="w-[35%] min-w-[350px] flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in-left">

          {/* Tabs Header */}
          <div className="flex-none flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'manual' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              ✏️ Manual
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === 'bulk' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
            >
              📂 Import
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative">
            {/* Decorative Top Line */}
            <div className={`absolute top-0 left-0 w-full h-1 ${editId ? 'bg-blue-500' : activeTab === 'manual' ? 'bg-orange-500' : 'bg-amber-500'}`}></div>

            {activeTab === 'manual' ? (
              // --- MANUAL FORM ---
              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h2 className={`text-lg font-black ${editId ? 'text-blue-600' : 'text-gray-800'}`}>
                    {editId ? '🛠️ Edit Room' : '🏗️ New Room'}
                  </h2>
                  {editId && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Editing</span>}
                </div>

                <div className="group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Room Name/Number</label>
                  <input
                    type="text"
                    placeholder="Ex: Hall 101"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-50 outline-none transition-all font-bold text-gray-700"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Student Capacity</label>
                  <input
                    type="number"
                    placeholder="60"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-50 outline-none transition-all font-mono"
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="group">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE (Optional)"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-50 outline-none transition-all"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    required
                  />
                </div>

                {/* Visual Type Selector */}
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Room Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'LectureHall' })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${form.type === 'LectureHall' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                    >
                      <span className="text-2xl">🏫</span>
                      <span className="font-bold text-sm">Lecture Hall</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, type: 'Lab' })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${form.type === 'Lab' ? 'border-green-500 bg-green-50 text-green-700 shadow-sm' : 'border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                    >
                      <span className="text-2xl">🔬</span>
                      <span className="font-bold text-sm">Laboratory</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="submit" className={`flex-1 py-3 text-white font-bold rounded-lg shadow-md hover:scale-[1.02] transition-transform ${editId ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-red-600'}`}>
                    {editId ? 'Update Room' : 'Save Room'}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      onClick={() => { setForm({ name: '', capacity: 60, type: 'LectureHall', department: 'General' }); setEditId(null) }}
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
                  <h2 className="text-lg font-black text-amber-700">📤 Bulk Upload</h2>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 mb-5 shadow-inner">
                  <p className="text-xs font-bold text-amber-800 uppercase mb-2 border-b border-amber-200 pb-1">
                    CSV Format Required
                  </p>
                  <code className="bg-white px-2 py-1 rounded border border-amber-200 text-[10px] font-mono block mb-2 text-amber-900">
                    Name, Capacity, Type, Dept
                  </code>
                  <div className="mt-3 bg-slate-800 text-gray-300 text-[10px] font-mono p-2 rounded border border-slate-600">
                    Room 101, 60, LectureHall, CSE<br />
                    Chem Lab 2, 30, Lab, Science
                  </div>
                </div>

                <form onSubmit={handleBulkSubmit} className="space-y-4 mt-auto">
                  <label className="block w-full cursor-pointer group">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center group-hover:border-amber-500 group-hover:bg-amber-50 transition-all">
                      <span className="text-3xl block mb-2 group-hover:scale-110 transition">📄</span>
                      <span className="text-xs font-bold text-gray-500 group-hover:text-amber-600">
                        {csvFile ? csvFile.name : "Select CSV File"}
                      </span>
                    </div>
                    <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
                  </label>

                  <button type="submit" className="w-full py-3 text-white font-bold rounded-lg shadow-md bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:scale-[1.02] transition-all">
                    Upload & Process
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: LIST (Fills Remaining Width, Internally Scrollable) */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-slide-in-right">
          {/* List Header */}
          <div className="flex-none p-5 border-b border-gray-100 bg-white/80 backdrop-blur z-10 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Rooms List</h2>
              <p className="text-xs text-gray-400">Total Infrastructure: {rooms.length}</p>
            </div>
            <div className="flex gap-2 items-center"> {/* Added flex gap-2 for buttons */}
              <button
                onClick={deleteAll}
                className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition text-sm"
              >
                ⚠️ Delete All
              </button>
              <div className="h-8 w-8 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold text-xs shadow-sm">
                {rooms.length}
              </div>
            </div>
          </div>

          {/* Scrollable List Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30 p-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {rooms.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                  <span className="text-5xl mb-3">🏫</span>
                  <p className="text-gray-500 font-bold">No rooms found</p>
                </div>
              )}

              {rooms.map((r, i) => (
                <div key={r._id}
                  className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all flex flex-col justify-between group relative overflow-hidden"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  {/* Side Color Bar */}
                  <div className={`absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity ${r.type === 'Lab' ? 'bg-green-400' : 'bg-orange-400'}`}></div>

                  <div>
                    <div className="flex justify-between items-start mb-2 pl-2">
                      <h3 className="font-bold text-gray-800 text-lg leading-tight">{r.name}</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-200 uppercase">{r.department}</span>
                    </div>

                    <div className="pl-2 mt-2 flex gap-2">
                      <div className="text-xs font-bold text-gray-500 bg-gray-50 inline-block px-2 py-1 rounded border border-gray-200">
                        Capacity: <span className="text-gray-800">{r.capacity}</span>
                      </div>
                      {r.type === 'Lab' ? (
                        <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded font-bold border border-green-100 flex items-center gap-1">
                          <span>🔬</span> Lab
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold border border-gray-200 flex items-center gap-1">
                          <span>🏫</span> Hall
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pl-2 mt-5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(r)} className="flex-1 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(r._id)} className="flex-1 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded hover:bg-red-100 transition">
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

export default Classrooms;