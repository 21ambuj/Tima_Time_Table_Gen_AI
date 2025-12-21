import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Generate() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");
    const [timetable, setTimetable] = useState([]);

    const [isUnsaved, setIsUnsaved] = useState(false);
    const [hasExistingData, setHasExistingData] = useState(false);

    const [viewFilter, setViewFilter] = useState("All");
    const [deptFilter, setDeptFilter] = useState("All");

    const [resourceAlert, setResourceAlert] = useState(null);
    const [sections, setSections] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Resource States for Validation
    const [teachersCount, setTeachersCount] = useState(0);
    const [subjectsCount, setSubjectsCount] = useState(0);
    const [roomsCount, setRoomsCount] = useState(0);

    useEffect(() => {
        const socket = io('http://localhost:5000');
        socket.on('progress', (data) => {
            // we ignore progress messages here for now as visual is cinematic
        });

        // FETCH ALL APPS DATA FRESH
        const fetchData = async () => {
            try {
                const [secRes, teaRes, subRes, roomRes, timeRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/sections', { withCredentials: true }).catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/teachers', { withCredentials: true }).catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/subjects', { withCredentials: true }).catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/classrooms', { withCredentials: true }).catch(() => ({ data: [] })),
                    axios.get('http://localhost:5000/api/timetable', { withCredentials: true }).catch(() => ({ data: [] }))
                ]);

                // Update Sections & Departments
                setSections(secRes.data || []);
                const depts = [...new Set((secRes.data || []).map(s => s.department))].filter(Boolean).sort();
                setDepartments(depts);

                // Update Counts for Validation
                setTeachersCount(teaRes.data?.length || 0);
                setSubjectsCount(subRes.data?.length || 0);
                setRoomsCount(roomRes.data?.length || 0);

                // Timetable State
                if (timeRes.data && timeRes.data.length > 0) {
                    setTimetable(timeRes.data);
                    setIsUnsaved(false);
                    setHasExistingData(true);
                } else {
                    setTimetable([]);
                    setIsUnsaved(false);
                    setHasExistingData(false);
                }

            } catch (err) { console.error("Data Fetch Error", err); }
        };

        fetchData();

        return () => socket.disconnect();
    }, []);

    const handleGenerate = async () => {
        // STRICT PRE-GENERATION VALIDATION
        const missing = [];
        if (sections.length === 0) missing.push("Sections");
        if (teachersCount === 0) missing.push("Teachers");
        if (subjectsCount === 0) missing.push("Subjects");
        if (roomsCount === 0) missing.push("Classrooms");

        if (missing.length > 0) {
            setResourceAlert({
                type: "CRITICAL_MISSING_DATA",
                details: {
                    sections: sections.length === 0 ? { "SYSTEM": 1 } : undefined,
                    teachers: teachersCount === 0 ? { "SYSTEM": 1 } : undefined,
                    subjects: subjectsCount === 0 ? { "SYSTEM": 1 } : undefined,
                    rooms: roomsCount === 0 ? { "SYSTEM": 1 } : undefined
                }
            });
            return;
        }
        setLoading(true);
        setTimetable([]);
        setResourceAlert(null);
        setProgress(0);
        setMessage("Initializing Core...");

        // --- ADVANCED CINEMATIC ANIMATION ---
        const minDuration = 6000; // Min 10 seconds
        const variableDuration = Math.min(sections.length * 500, 20000);
        const totalDuration = minDuration + variableDuration;

        const startTime = Date.now();

        // Professional Status Messages
        const loadingStages = [
            "Initializing Neural Network...",
            "Parsing Department Constraints...",
            "Allocating Faculty Resources...",
            "Detecting Time Collisions...",
            "Optimizing Room Usage...",
            "Running Genetic Algorithms...",
            "Verifying Credit Hours...",
            "Finalizing Schedule Matrix..."
        ];

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const rawPercent = (elapsed / totalDuration) * 100;
            const visualProgress = Math.min(99, Math.floor(rawPercent));

            setProgress(visualProgress);

            // Calculate which message to show based on progress
            const stageIndex = Math.floor((visualProgress / 100) * loadingStages.length);
            const currentStage = loadingStages[Math.min(stageIndex, loadingStages.length - 1)];
            setMessage(currentStage);

        }, 50);

        try {
            const res = await axios.post('http://localhost:5000/api/generate', { sections }, { withCredentials: true });

            const elapsed = Date.now() - startTime;
            const remaining = totalDuration - elapsed;
            if (remaining > 0) {
                await new Promise(r => setTimeout(r, remaining));
            }

            clearInterval(interval);
            setProgress(100);
            setMessage("Generation Complete.");
            await new Promise(r => setTimeout(r, 800));

            setTimetable(res.data.schedule || []);

            if (res.data.alert) {
                setResourceAlert(res.data.alert);
                if (res.data.alert.type === "CRITICAL_MISSING_DATA") {
                    setIsUnsaved(false);
                } else {
                    setIsUnsaved(true);
                }
            } else {
                setIsUnsaved(true);
            }

        } catch (err) {
            clearInterval(interval);
            const errorData = err.response?.data;
            if (errorData?.alert) {
                // If the server sends a structured alert (shortage details), show the nice modal
                setResourceAlert(errorData.alert);
            } else {
                // Otherwise fallback to generic alert
                alert("Error: " + (errorData?.error || err.message));
            }
        } finally {
            clearInterval(interval);
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (timetable.length === 0) return alert("Generate a timetable first.");

        const confirmMsg = hasExistingData
            ? `⚠️ OVERWRITE WARNING:\n\nYou are about to overwrite the existing live schedule for School Code: ${user?.schoolId}.\n\nThis action cannot be undone. Are you sure?`
            : "Confirm Publish: This schedule will become visible to all students and teachers immediately.";

        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.post('http://localhost:5000/api/timetable/save', { schedule: timetable }, { withCredentials: true });
            alert("✅ Published successfully!");
            setIsUnsaved(false);
            setHasExistingData(true);
        } catch (err) { alert("❌ Save failed. Please try again."); }
    };

    const handleDiscardDraft = () => {
        if (!window.confirm("Discard this draft and revert to the live schedule?")) return;
        fetchLiveData();
        setResourceAlert(null);
    };

    const handleDeleteLive = async () => {
        if (!window.confirm("⚠️ DANGER: This will delete the LIVE database for your school. Are you sure?")) return;
        try {
            await axios.delete('http://localhost:5000/api/timetable', { withCredentials: true });
            setTimetable([]);
            setIsUnsaved(false);
            setHasExistingData(false);
            setResourceAlert(null);
            alert("✅ Schedule cleared.");
        } catch (err) { setTimetable([]); }
    };

    // Reset View
    const handleReset = () => {
        if (isUnsaved) {
            handleDiscardDraft();
        } else {
            setTimetable([]);
            setResourceAlert(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-800 relative overflow-hidden selection:bg-emerald-500 selection:text-white">

            {/* Background FX */}
            <div className="fixed inset-0 z-0 pointer-events-none print:hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-100/40 rounded-full blur-[120px]"></div>
            </div>

            {/* --- RESOURCE ALERT MODAL --- */}
            {resourceAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-red-100 ring-4 ring-red-50/50">
                        <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                            <div className="bg-red-100 p-3 rounded-full text-2xl shadow-sm">⚠️</div>
                            <div>
                                <h3 className="text-xl font-black text-red-700 leading-tight">
                                    {resourceAlert.type === "CRITICAL_MISSING_DATA" ? "Data Missing" : "Optimization Alert"}
                                </h3>
                                <p className="text-red-500 text-sm font-bold mt-1">
                                    {resourceAlert.type === "CRITICAL_MISSING_DATA"
                                        ? "Cannot proceed with generation."
                                        : `${resourceAlert.count} classes could not be scheduled.`}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar">
                            {resourceAlert.type === "CRITICAL_MISSING_DATA" ? (
                                <div className="text-center py-4">
                                    <p className="text-slate-600 mb-4 font-medium">Your database is empty. You must add data first:</p>
                                    <div className="space-y-2">
                                        {resourceAlert.details.sections && resourceAlert.details.sections["SYSTEM"] && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold flex items-center gap-2"><span>❌</span> Sections (0 Found)</div>}
                                        {resourceAlert.details.teachers && resourceAlert.details.teachers["SYSTEM"] && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold flex items-center gap-2"><span>❌</span> Teachers (0 Found)</div>}
                                        {resourceAlert.details.subjects && resourceAlert.details.subjects["SYSTEM"] && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold flex items-center gap-2"><span>❌</span> Subjects (0 Found)</div>}
                                        {resourceAlert.details.rooms && resourceAlert.details.rooms["SYSTEM"] && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-bold flex items-center gap-2"><span>❌</span> Classrooms (0 Found)</div>}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-6">Use the buttons above to add data.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Debug Probe */}
                                    {console.log("Alert Payload:", resourceAlert)}

                                    {(Object.keys(resourceAlert.details?.teachers || {}).length > 0 ||
                                        (resourceAlert.details?.rooms?.LectureHall > 0 || resourceAlert.details?.rooms?.Lab > 0)) && (
                                            <div className="mb-4 text-sm text-slate-500">Detailed list of missing resources:</div>
                                        )}

                                    {Object.keys(resourceAlert.details?.teachers || {}).length > 0 && (
                                        <div className="mb-6">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Faculty Shortages</h4>
                                            <div className="space-y-2">
                                                {Object.entries(resourceAlert.details.teachers).map(([subject, count]) => (
                                                    <div key={subject} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-lg">👨‍🏫</span>
                                                            <span className="font-bold text-slate-700 text-sm">{subject}</span>
                                                        </div>
                                                        <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded">-{count} Slots</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(resourceAlert.details.rooms.LectureHall > 0 || resourceAlert.details.rooms.Lab > 0) && (
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Room Shortages</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                {resourceAlert.details.rooms.LectureHall > 0 && <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center"><div className="text-2xl font-black text-amber-600 mb-1">{resourceAlert.details.rooms.LectureHall}</div><div className="text-xs font-bold text-amber-700">Halls Needed</div></div>}
                                                {resourceAlert.details.rooms.Lab > 0 && <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 text-center"><div className="text-2xl font-black text-purple-600 mb-1">{resourceAlert.details.rooms.Lab}</div><div className="text-xs font-bold text-purple-700">Labs Needed</div></div>}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setResourceAlert(null)} className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-black transition shadow-lg">Acknowledge</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 container mx-auto px-6 py-8 max-w-7xl">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 print:hidden">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Generator<span className="text-emerald-500">Console</span></h1>
                        <p className="text-slate-500 mt-1">Manage & Optimize Institutional Schedules</p>
                        {/* Admin Context */}
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">Admin: {user?.name || "User"}</span>
                            <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded border border-emerald-100 font-mono">Code: {user?.schoolId || "Unknown"}</span>
                        </div>
                    </div>

                    {/* NEW: Expanded Navigation Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <Link to="/subjects" className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span>📚</span> Subjects
                        </Link>
                        <Link to="/teachers" className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span>👨‍🏫</span> Teachers
                        </Link>
                        <Link to="/rooms" className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span>🏫</span> Rooms
                        </Link>
                        <Link to="/sections" className="px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-emerald-200 hover:text-emerald-700 transition text-xs font-bold text-slate-600 flex items-center gap-2">
                            <span>👥</span> Sections
                        </Link>
                        <Link to="/admin" className="px-4 py-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-black transition text-xs font-bold flex items-center gap-2">
                            <span>←</span> Dashboard
                        </Link>
                    </div>
                </div>

                {/* LOADING ANIMATION */}
                {loading && (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
                        <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 border-4 border-emerald-100 rounded-full animate-ping opacity-20"></div>
                            <div className="absolute inset-2 border-[3px] border-transparent border-t-emerald-500 border-r-emerald-500 rounded-full animate-spin-fast"></div>
                            <div className="absolute inset-6 border-[6px] border-slate-100 rounded-full"></div>
                            <div className="absolute inset-6 border-[6px] border-transparent border-l-teal-400 rounded-full animate-spin-slow-reverse"></div>
                            <div className="absolute inset-0 flex items-center justify-center flex-col z-10">
                                <span className="text-5xl font-black text-emerald-600 tracking-tighter">{progress}%</span>
                                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest mt-1 animate-pulse">Processing</span>
                            </div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-orbit"></div>
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Synthesizing Schedule</h2>
                        <div className="bg-white/80 backdrop-blur border border-emerald-100 px-6 py-2 rounded-full shadow-sm">
                            <p className="text-emerald-700 font-mono text-sm font-bold flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                {message || "Initializing Core..."}
                            </p>
                        </div>
                    </div>
                )}

                {/* START SCREEN */}
                {!loading && timetable.length === 0 && (
                    <div className="bg-white/80 backdrop-blur-xl p-16 text-center rounded-3xl shadow-xl border border-white/50 print:hidden animate-fade-in-up">
                        <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner text-5xl">⚡</div>
                        <h2 className="text-3xl font-black text-slate-900 mb-3">Ready to Schedule</h2>
                        <p className="text-slate-500 mb-10 text-lg max-w-md mx-auto">The AI engine is primed to process <strong>{sections.length} active sections</strong> across <strong>{departments.length} departments</strong>.</p>

                        {/* START SCREEN RESOURCE SUMMARY */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 max-w-2xl mx-auto">
                            <div className="text-center p-3 bg-white/50 rounded-xl border border-white/60">
                                <span className="block text-2xl font-black text-slate-800">{sections.length}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sections</span>
                            </div>
                            <div className="text-center p-3 bg-white/50 rounded-xl border border-white/60">
                                <span className="block text-2xl font-black text-slate-800">{teachersCount}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teachers</span>
                            </div>
                            <div className="text-center p-3 bg-white/50 rounded-xl border border-white/60">
                                <span className="block text-2xl font-black text-slate-800">{subjectsCount}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subjects</span>
                            </div>
                            <div className="text-center p-3 bg-white/50 rounded-xl border border-white/60">
                                <span className="block text-2xl font-black text-slate-800">{roomsCount}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rooms</span>
                            </div>
                        </div>

                        <button onClick={handleGenerate} className="px-10 py-5 font-bold text-lg text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 ring-4 ring-emerald-50/50">
                            🚀 Launch Generator
                        </button>
                    </div>
                )}

                {/* RESULTS TABLE */}
                {!loading && timetable.length > 0 && (
                    <div className="animate-fade-in space-y-6">

                        {/* Status Bar */}
                        {isUnsaved ? (
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm flex justify-between items-center print:hidden">
                                <div className="flex items-center gap-3"><span className="text-2xl">⚠️</span><div><h4 className="font-black text-amber-800">Unsaved Draft</h4><p className="text-sm text-amber-700">Review before publishing.</p></div></div>
                                <div className="flex gap-3">
                                    <button onClick={handleDiscardDraft} className="px-4 py-2 bg-white text-amber-700 font-bold rounded-lg border border-amber-200 hover:bg-amber-100 transition">Discard</button>
                                    <button onClick={handleSave} className="px-6 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 shadow-md transition">Publish Now</button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl shadow-sm flex justify-between items-center print:hidden">
                                <div className="flex items-center gap-3"><span className="text-2xl">✅</span><div><h4 className="font-black text-emerald-800">Live Schedule Active</h4><p className="text-sm text-emerald-700">Visible to students and faculty.</p></div></div>
                                <div className="flex gap-3">
                                    <button onClick={handleDeleteLive} className="px-4 py-2 bg-white text-red-600 font-bold rounded-lg border border-red-200 hover:bg-red-50 transition">Delete Time Table</button>
                                    <button onClick={handleGenerate} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md transition">Regenerate</button>
                                </div>
                            </div>
                        )}

                        <div className="sticky top-4 z-20 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm border border-slate-200">📊 {timetable.length} Slots</div>
                                <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 font-bold outline-none focus:ring-2 ring-emerald-500 min-w-[150px]" onChange={e => setDeptFilter(e.target.value)}>
                                    <option value="All">All Departments</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl p-2.5 font-bold outline-none focus:ring-2 ring-emerald-500 min-w-[150px]" onChange={e => setViewFilter(e.target.value)}>
                                    <option value="All">All Sections</option>
                                    {sections.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleReset} className="px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-100">Reset</button>
                                <button onClick={() => window.print()} className="px-5 py-2 text-sm font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition shadow-md">Print</button>
                                <button onClick={handleSave} className="px-6 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">Save</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden print:shadow-none print:border print:rounded-none">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs border-b border-slate-200">
                                        <tr><th className="p-5">Section</th><th className="p-5">Dept</th><th className="p-5">Day</th><th className="p-5">Time</th><th className="p-5">Subject</th><th className="p-5">Room</th><th className="p-5">Teacher</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {timetable
                                            .filter(t => (viewFilter === "All" || t.className === viewFilter) && (deptFilter === "All" || t.department === deptFilter))
                                            .map((t, i) => (
                                                <tr key={i} className="hover:bg-slate-50/80 transition-colors print:break-inside-avoid animate-slide-in-row" style={{ animationDelay: `${Math.min(i * 30, 1000)}ms` }}>
                                                    <td className="p-5 font-black text-slate-700">{t.className}</td>
                                                    <td className="p-5"><span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">{t.department}</span></td>
                                                    <td className="p-5 font-bold text-slate-600">{t.day}</td>
                                                    <td className="p-5 font-mono text-xs text-slate-500 bg-slate-50 px-2 rounded w-fit">{t.time}</td>
                                                    <td className="p-5">
                                                        {t.type === 'Break' ? (
                                                            <span className="text-amber-600 font-bold italic flex items-center gap-2"><span>☕</span> Lunch</span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-800">{t.subject}</span>
                                                                {t.type === 'practical' && <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-black uppercase">LAB</span>}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-5">{t.type !== 'Break' && <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold shadow-sm">{t.room}</span>}</td>
                                                    <td className="p-5 text-slate-500 font-medium text-xs">{t.teacher}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
          @media print { .print\\:hidden { display: none !important; } }
          
          .animate-spin-fast { animation: spin 1s linear infinite; }
          .animate-spin-slow-reverse { animation: spin 4s linear infinite reverse; }
          .animate-orbit { animation: orbit 2s linear infinite; }
          .animate-slide-in-row { opacity: 0; animation: slideInRow 0.3s ease-out forwards; }

          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          
          @keyframes orbit {
              0% { transform: rotate(0deg) translateX(50px) rotate(0deg); }
              100% { transform: rotate(360deg) translateX(50px) rotate(-360deg); }
          }
          
          @keyframes slideInRow {
              from { opacity: 0; transform: translateX(-10px); }
              to { opacity: 1; transform: translateX(0); }
          }
      `}</style>
        </div>
    );
}

export default Generate;