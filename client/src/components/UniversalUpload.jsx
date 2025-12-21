import React, { useState } from 'react';
import axios from 'axios';

const UniversalUpload = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setStats(null);
        setError("");
    };

    const handleUpload = async () => {
        if (!file) return setError("Please select a file first.");

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            try {
                const res = await axios.post('http://localhost:5000/api/import/universal',
                    { csvData: text },
                    { withCredentials: true }
                );

                if (res.data.success) {
                    setStats(res.data.stats);
                    if (onUploadSuccess) onUploadSuccess();
                } else {
                    setError("Upload failed.");
                }
            } catch (err) {
                setError("Error uploading file: " + (err.response?.data?.error || err.message));
            } finally {
                setLoading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        📂 Universal CSV Uploader
                    </h3>
                    <p className="text-sm text-slate-500">
                        Upload Teachers, Subjects, Rooms, or Sections in one file.
                    </p>
                </div>
                <button
                    onClick={() => {
                        const csvContent = "data:text/csv;charset=utf-8,Type,Name,Department,Detail1,Detail2,Detail3\nTeacher,John Doe,CSE,john@test.com,Maths;Physics,\nSubject,Mathematics,CSE,MAT101,3,Theory\nRoom,Room 101,CSE,60,LectureHall,\nSection,K23-A,CSE,,,";
                        const encodedUri = encodeURI(csvContent);
                        const link = document.createElement("a");
                        link.setAttribute("href", encodedUri);
                        link.setAttribute("download", "timetable_template.csv");
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }}
                    className="text-xs bg-white text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-50 transition shadow-sm flex items-center gap-1"
                >
                    ⬇️ Download Template
                </button>
            </div>

            {/* FORMAT GUIDE */}
            <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    CSV Format Guide
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-400">
                            <tr>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Dept</th>
                                <th className="px-4 py-2">Detail 1</th>
                                <th className="px-4 py-2">Detail 2</th>
                                <th className="px-4 py-2">Detail 3</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            <tr>
                                <td className="px-4 py-2 font-mono text-indigo-600 font-bold">Teacher</td>
                                <td className="px-4 py-2">Full Name</td>
                                <td className="px-4 py-2">Dept Codes</td>
                                <td className="px-4 py-2">Email</td>
                                <td className="px-4 py-2">Subjects (semicolon split)</td>
                                <td className="px-4 py-2 text-slate-300">-</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 font-mono text-pink-600 font-bold">Subject</td>
                                <td className="px-4 py-2">Subject Name</td>
                                <td className="px-4 py-2">Dept Code</td>
                                <td className="px-4 py-2">Sub Code</td>
                                <td className="px-4 py-2">Credits</td>
                                <td className="px-4 py-2">Type (Theory/Lab)</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 font-mono text-amber-600 font-bold">Room</td>
                                <td className="px-4 py-2">Room Name</td>
                                <td className="px-4 py-2">Dept Code</td>
                                <td className="px-4 py-2">Capacity</td>
                                <td className="px-4 py-2">Type (LectureHall/Lab)</td>
                                <td className="px-4 py-2 text-slate-300">-</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 font-mono text-cyan-600 font-bold">Section</td>
                                <td className="px-4 py-2">Section Name</td>
                                <td className="px-4 py-2">Dept Code</td>
                                <td className="px-4 py-2 text-slate-300">-</td>
                                <td className="px-4 py-2 text-slate-300">-</td>
                                <td className="px-4 py-2 text-slate-300">-</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-dashed border-slate-300">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition"
                />
                <button
                    onClick={handleUpload}
                    disabled={loading || !file}
                    className={`px-6 py-2 rounded-lg font-bold text-white transition shadow-md whitespace-nowrap ${loading || !file ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {loading ? 'Processing...' : 'Upload & Process'}
                </button>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100 flex items-center gap-2">
                    <span>❌</span> {error}
                </div>
            )}

            {stats && (
                <div className="mt-4 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 animate-slide-in-row">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">✅</span>
                        <span className="font-bold">Import Successful!</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                            <div className="font-black text-lg">{stats.teachers}</div>
                            <div className="text-xs text-slate-500 uppercase">Teachers</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                            <div className="font-black text-lg">{stats.subjects}</div>
                            <div className="text-xs text-slate-500 uppercase">Subjects</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                            <div className="font-black text-lg">{stats.rooms}</div>
                            <div className="text-xs text-slate-500 uppercase">Rooms</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-emerald-100 text-center">
                            <div className="font-black text-lg">{stats.sections}</div>
                            <div className="text-xs text-slate-500 uppercase">Sections</div>
                        </div>
                    </div>
                    {stats.errors && stats.errors.length > 0 && (
                        <div className="mt-3 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                            <div className="font-bold mb-1">Warning: {stats.errors.length} rows passed with errors</div>
                            <ul className="list-disc pl-4 space-y-1">
                                {stats.errors.slice(0, 3).map((e, i) => <li key={i}>{e}</li>)}
                                {stats.errors.length > 3 && <li>...and {stats.errors.length - 3} more</li>}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            <style>{`
        .animate-slide-in-row { animation: slideIn 0.3s ease-out forwards; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
};

export default UniversalUpload;
