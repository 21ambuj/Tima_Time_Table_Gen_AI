import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Sections() {
  const [sections, setSections] = useState([]);
  const [activeTab, setActiveTab] = useState('interactive');

  // Inputs
  const [manualName, setManualName] = useState("");
  const [manualDept, setManualDept] = useState("");

  const [bulkPrefix, setBulkPrefix] = useState("Class");
  const [bulkDept, setBulkDept] = useState("General");
  const [bulkCount, setBulkCount] = useState("");
  const [csvFile, setCsvFile] = useState(null);

  // FETCH SECTIONS FROM DB
  const fetchSections = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/sections', { withCredentials: true });
      setSections(res.data);
      // Sync to local storage for Generator usage if needed
      localStorage.setItem('timetable_sections', JSON.stringify(res.data));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  // --- ACTIONS ---

  const addManual = async () => {
    const nameClean = manualName.trim();
    const deptClean = manualDept.trim();

    if (!nameClean || !deptClean) return alert("Enter Name and Department");

    try {
      await axios.post('http://localhost:5000/api/sections', { name: nameClean, department: deptClean }, { withCredentials: true });
      setManualName("");
      fetchSections();
    } catch (err) { alert("Error: " + err.response?.data?.message); }
  };

  const addBulkGen = async () => {
    const count = parseInt(bulkCount);
    if (!count || count <= 0) return alert("Enter valid quantity");

    const prefix = bulkPrefix.trim() || "Section";
    const dept = bulkDept.trim() || "General";

    const newSecs = [];
    for (let i = 1; i <= count; i++) {
      newSecs.push({ name: `${prefix}-${i}`, department: dept });
    }

    try {
      const res = await axios.post('http://localhost:5000/api/sections/bulk', newSecs, { withCredentials: true });
      alert(res.data.message);
      setBulkCount("");
      fetchSections();
    } catch (err) { alert("Bulk Gen Error: " + err.response?.data?.message); }
  };

  const handleCsvUpload = (e) => {
    e.preventDefault();
    if (!csvFile) return alert("Select a file");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split(/\r?\n/);
      const newSecs = [];

      rows.forEach(rowString => {
        if (!rowString.trim()) return;
        const cols = rowString.split(',');
        if (cols.length >= 1) {
          const name = cols[0].trim();
          const dept = cols[1] && cols[1].trim() ? cols[1].trim().toUpperCase() : "GENERAL";
          if (name) newSecs.push({ name, department: dept });
        }
      });

      if (newSecs.length === 0) return alert("No valid sections found.");

      try {
        const res = await axios.post('http://localhost:5000/api/sections/bulk', newSecs, { withCredentials: true });
        alert(res.data.message);
        setCsvFile(null);
        fetchSections();
      } catch (err) { alert("CSV Upload Failed: " + err.response?.data?.message); }
    };
    reader.readAsText(csvFile);
  };

  const removeSection = async (id) => {
    if (!window.confirm("Delete this section?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/sections/${id}`, { withCredentials: true });
      fetchSections();
    } catch (err) { alert("Delete failed"); }
  };



  // Calculate Department Breakdown for UI
  const deptSummary = sections.reduce((acc, curr) => {
    const dept = curr.department || "General";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  // Delete All
  const deleteAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will delete ALL sections. This action cannot be undone.")) return;
    try {
      await axios.delete('http://localhost:5000/api/sections', { withCredentials: true });
      setSections([]);
      alert("All sections deleted.");
    } catch (err) {
      alert("Delete failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-20">
        <div className="animate-fade-in">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 bg-clip-text text-transparent">
            Manage Sections
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Class Groups & Divisions
          </p>
        </div>
        <Link to="/admin" className="px-5 py-2 text-sm font-bold text-gray-600 border border-gray-300 rounded-full hover:bg-gray-50 hover:text-teal-600 transition-all">
          ← Dashboard
        </Link>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl">

        {Object.keys(deptSummary).length > 0 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-teal-100 mb-8 animate-fade-in">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Workload Breakdown</h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(deptSummary).map(([dept, count]) => (
                <div key={dept} className="flex flex-col items-center justify-center bg-teal-50 border border-teal-100 px-6 py-3 rounded-xl min-w-[100px]">
                  <span className="text-2xl font-black text-teal-600">{count}</span>
                  <span className="text-xs font-bold text-teal-400 uppercase">{dept}</span>
                </div>
              ))}
              <div className="flex flex-col items-center justify-center bg-gray-100 border border-gray-200 px-6 py-3 rounded-xl min-w-[100px]">
                <span className="text-2xl font-black text-gray-600">{sections.length}</span>
                <span className="text-xs font-bold text-gray-400 uppercase">Total</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          {/* TABS */}
          <div className="bg-gray-50 border-b border-gray-200 flex">
            <button onClick={() => setActiveTab('interactive')} className={`px-8 py-4 text-sm font-bold border-b-2 ${activeTab === 'interactive' ? 'border-teal-600 text-teal-700 bg-teal-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Interactive Tools</button>
            <button onClick={() => setActiveTab('csv')} className={`px-8 py-4 text-sm font-bold border-b-2 ${activeTab === 'csv' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>CSV Upload</button>
          </div>

          <div className="p-8">
            {/* TAB 1 */}
            {activeTab === 'interactive' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Manual */}
                <div className="bg-teal-50/30 p-6 rounded-xl border border-teal-100">
                  <label className="block text-teal-900 font-bold mb-3 text-sm">Add Single Class</label>
                  <div className="flex gap-2 mb-2">
                    <input className="border border-teal-200 p-2 w-full rounded focus:outline-teal-500 bg-white" placeholder="Name (e.g. K23-A)" value={manualName} onChange={e => setManualName(e.target.value)} />
                    <input className="border border-teal-200 p-2 w-full rounded focus:outline-teal-500 bg-white" placeholder="Dept (e.g. CSE)" value={manualDept} onChange={e => setManualDept(e.target.value)} />
                  </div>
                  <button onClick={addManual} className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-2 w-full rounded font-bold hover:shadow-lg transition">Add Section</button>
                </div>
                {/* Auto Gen */}
                <div className="bg-emerald-50/30 p-6 rounded-xl border border-emerald-100">
                  <label className="block text-emerald-900 font-bold mb-3 text-sm">Sequence Generator</label>
                  <div className="flex gap-2 mb-2">
                    <input className="border border-emerald-200 p-2 w-full rounded focus:outline-emerald-500 bg-white" placeholder="Prefix (Class)" value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} />
                    <input className="border border-emerald-200 p-2 w-full rounded focus:outline-emerald-500 bg-white" placeholder="Dept (General)" value={bulkDept} onChange={e => setBulkDept(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <input type="number" className="border border-emerald-200 p-2 w-24 rounded focus:outline-emerald-500 bg-white" placeholder="Qty" value={bulkCount} onChange={e => setBulkCount(e.target.value)} />
                    <button onClick={addBulkGen} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 flex-1 rounded font-bold hover:shadow-lg transition">Generate Sequence</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2 */}
            {activeTab === 'csv' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
                <p className="text-sm text-gray-500 mb-4 font-mono bg-white p-2 border rounded">Format: Section Name, Department</p>
                <form onSubmit={handleCsvUpload} className="flex gap-4 items-center">
                  <input type="file" accept=".csv" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-teal-100 file:text-teal-700 hover:file:bg-teal-200 transition" onChange={e => setCsvFile(e.target.files[0])} />
                  <button type="submit" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:shadow-lg whitespace-nowrap">Upload CSV</button>
                </form>
              </div>
            )}

            {/* LIST */}
            <div>
              <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-2">
                <h4 className="font-bold text-gray-700">Active Sections List ({sections.length})</h4>
                <button
                  onClick={deleteAll}
                  className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                >
                  ⚠️ Delete All
                </button>
              </div>
              <div className="flex flex-wrap gap-3 min-h-[100px] p-4 bg-gray-50/50 rounded-xl border border-gray-200 border-dashed">
                {sections.length === 0 && <p className="text-gray-400 italic w-full text-center py-8">No sections added.</p>}
                {sections.map((sec, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 px-3 py-2 rounded-lg shadow-sm flex items-center gap-3 hover:shadow-md hover:border-teal-200 transition group relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div>
                      <div className="text-sm font-bold text-gray-800">{sec.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{sec.department}</div>
                    </div>
                    <button onClick={() => removeSection(sec._id)} className="text-gray-300 hover:text-red-500 font-bold text-lg leading-none ml-2">&times;</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-200 flex justify-end">
            {sections.length > 0 ? (
              <Link to="/generate" className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-[1.02] transition flex items-center gap-2">
                <span>🚀</span>AI Generator Console
              </Link>
            ) : (
              <button disabled className="bg-gray-200 text-gray-400 px-8 py-3 rounded-xl font-bold cursor-not-allowed">Add Sections First</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sections;