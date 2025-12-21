import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DeveloperPanel() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    // Data States
    const [stats, setStats] = useState({ admins: 0, teachers: 0, students: 0, feedback: 0, support: 0 });
    const [users, setUsers] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [activeTab, setActiveTab] = useState('users');
    const [userRoleFilter, setUserRoleFilter] = useState('all');
    const [ticketFilter, setTicketFilter] = useState('open'); // 'open', 'resolved', 'all'
    const [searchTerm, setSearchTerm] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('all');

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [modalTab, setModalTab] = useState('manual'); // 'manual' or 'bulk'
    const [userForm, setUserForm] = useState({ _id: '', name: '', email: '', password: '', role: 'student', schoolId: '' });
    const [csvFile, setCsvFile] = useState(null);

    // FETCH DATA
    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [statsRes, usersRes, feedbackRes, supportRes] = await Promise.all([
                axios.get('http://localhost:5000/api/dev/stats', { withCredentials: true }),
                axios.get('http://localhost:5000/api/dev/users', { withCredentials: true }),
                axios.get('http://localhost:5000/api/dev/feedback', { withCredentials: true }),
                axios.get('http://localhost:5000/api/dev/support', { withCredentials: true })
            ]);

            setStats(statsRes.data);
            setUsers(usersRes.data);

            // Sort Latest First
            setFeedbacks(feedbackRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setTickets(supportRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

        } catch (err) {
            console.error("Dev Panel Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // --- ACTIONS ---

    const handleDeleteUser = async (id) => {
        if (!window.confirm("⚠️ Irreversible Action: Delete this user?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/dev/users/${id}`, { withCredentials: true });
            fetchAllData();
        } catch (err) { alert("Delete failed"); }
    };

    const handleResolveTicket = async (id) => {
        try {
            // Optimistic UI Update
            setTickets(prev => prev.map(t => t._id === id ? { ...t, status: 'resolved' } : t));

            // API Call to Persist
            await axios.put(`http://localhost:5000/api/dev/support/${id}`, { status: 'resolved' }, { withCredentials: true });
            alert("✅ Ticket marked resolved.");
        } catch (err) {
            alert("Failed to update status.");
            fetchAllData(); // Revert on failure
        }
    };

    // --- MODAL HANDLERS ---
    const openAddModal = () => {
        setIsEditing(false);
        setModalTab('manual');
        setUserForm({ name: '', email: '', password: '', role: 'student', schoolId: '' });
        setCsvFile(null);
        setShowModal(true);
    };

    const openEditModal = (u) => {
        setIsEditing(true);
        setModalTab('manual'); // Force manual for editing
        setUserForm({ _id: u._id, name: u.name, email: u.email, password: '', role: u.role, schoolId: u.schoolId || '' });
        setShowModal(true);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await axios.put(`http://localhost:5000/api/dev/users/${userForm._id}`, userForm, { withCredentials: true });
                alert("✅ User Updated");
            } else {
                await axios.post('http://localhost:5000/api/dev/users', userForm, { withCredentials: true });
                alert("✅ User Created");
            }
            setShowModal(false);
            fetchAllData();
        } catch (err) { alert("Error: " + (err.response?.data?.error || err.message)); }
    };

    const handleBulkUpload = async (e) => {
        e.preventDefault();
        if (!csvFile) return alert("Please select a CSV file.");

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split(/\r?\n/);
            const usersData = [];

            rows.forEach(rowString => {
                if (!rowString.trim()) return;
                const cols = rowString.split(',');

                // Expected: Name, Email, Password, Role, SchoolID
                if (cols.length >= 4) {
                    const name = cols[0].trim();
                    const email = cols[1].trim();
                    const password = cols[2].trim();
                    const role = cols[3].trim().toLowerCase();
                    const schoolId = cols[4] ? cols[4].trim() : "";

                    if (name && email && password && role) {
                        usersData.push({ name, email, password, role, schoolId });
                    }
                }
            });

            if (usersData.length === 0) return alert("No valid data found in CSV.");

            try {
                const res = await axios.post('http://localhost:5000/api/dev/users/bulk', usersData, { withCredentials: true });
                alert(res.data.message);
                setCsvFile(null);
                setShowModal(false);
                fetchAllData();
            } catch (err) {
                alert("Bulk Upload Failed: " + (err.response?.data?.error || err.message));
            }
        };
        reader.readAsText(csvFile);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // --- FILTERING LOGIC ---
    const uniqueSchools = [...new Set(users.map(u => u.schoolId).filter(Boolean))].sort();

    const filteredUsers = users.filter(u => {
        if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
        if (schoolFilter !== 'all' && u.schoolId !== schoolFilter) return false;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            return u.name.toLowerCase().includes(lower) || u.email.toLowerCase().includes(lower) || (u.schoolId && u.schoolId.toLowerCase().includes(lower));
        }
        return true;
    });

    const filteredTickets = tickets.filter(t => {
        const status = t.status || 'open';
        if (ticketFilter === 'all') return true;
        return status === ticketFilter;
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-cyan-500 selection:text-white relative overflow-hidden">

            {/* Background FX */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-100/50 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px]"></div>
            </div>

            {/* HEADER */}
            <header className="relative z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="text-3xl bg-cyan-100 p-2 rounded-xl">👨‍💻</span>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-wide">Developer<span className="text-cyan-600">Console</span></h1>
                        <p className="text-xs text-slate-500 font-mono font-bold tracking-wider">ROOT ACCESS GRANTED</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 hidden md:block">Logged in as <strong className="text-slate-800">{user?.name}</strong></span>
                    <button onClick={handleLogout} className="px-5 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 text-xs font-bold rounded-lg transition shadow-sm">
                        Secure Logout
                    </button>
                </div>
            </header>

            <div className="relative z-10 p-8 max-w-7xl mx-auto">

                {/* STATS OVERVIEW */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Admins</h3>
                        <p className="text-3xl font-black text-purple-600 mt-1">{stats.admins}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Teachers</h3>
                        <p className="text-3xl font-black text-indigo-600 mt-1">{stats.teachers}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Students</h3>
                        <p className="text-3xl font-black text-blue-600 mt-1">{stats.students}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Feedback</h3>
                        <p className="text-3xl font-black text-emerald-600 mt-1">{stats.feedback}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tickets</h3>
                        <p className="text-3xl font-black text-amber-600 mt-1">{stats.support}</p>
                    </div>
                </div>

                {/* MAIN TABS */}
                <div className="flex gap-2 mb-6 border-b border-slate-200 pb-1">
                    <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-t-xl font-bold text-sm transition ${activeTab === 'users' ? 'bg-white border-x border-t border-slate-200 text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>User Management</button>
                    <button onClick={() => setActiveTab('feedback')} className={`px-6 py-3 rounded-t-xl font-bold text-sm transition ${activeTab === 'feedback' ? 'bg-white border-x border-t border-slate-200 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>User Feedback</button>
                    <button onClick={() => setActiveTab('support')} className={`px-6 py-3 rounded-t-xl font-bold text-sm transition ${activeTab === 'support' ? 'bg-white border-x border-t border-slate-200 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>Support Tickets</button>
                </div>

                {/* TAB CONTENT CONTAINER */}
                <div className="bg-white rounded-b-2xl rounded-tr-2xl p-6 shadow-xl border border-slate-200 min-h-[500px]">
                    {loading && <div className="text-center py-20 text-slate-400 animate-pulse font-bold">Fetching System Data...</div>}

                    {/* === USER MANAGEMENT === */}
                    {!loading && activeTab === 'users' && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
                                <h2 className="text-xl font-bold text-slate-800">System Users Directory</h2>

                                <div className="flex flex-wrap gap-3 items-center">
                                    {/* SEARCH */}
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />

                                    {/* SCHOOL FILTER */}
                                    <select
                                        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none max-w-[150px]"
                                        value={schoolFilter}
                                        onChange={(e) => setSchoolFilter(e.target.value)}
                                    >
                                        <option value="all">All Schools</option>
                                        {uniqueSchools.map(sid => <option key={sid} value={sid}>{sid}</option>)}
                                    </select>

                                    {/* ROLE FILTER */}
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        {['all', 'admin', 'teacher', 'student', 'developer'].map(role => (
                                            <button
                                                key={role}
                                                onClick={() => setUserRoleFilter(role)}
                                                className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition ${userRoleFilter === role ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>

                                    <button onClick={openAddModal} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-bold shadow-md transition">
                                        + Add User
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="p-4 border-b border-slate-200">Name</th>
                                            <th className="p-4 border-b border-slate-200">Email</th>
                                            <th className="p-4 border-b border-slate-200">Role</th>
                                            <th className="p-4 border-b border-slate-200">School ID</th>
                                            <th className="p-4 border-b border-slate-200">Status</th>
                                            <th className="p-4 border-b border-slate-200 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm bg-white divide-y divide-slate-100">
                                        {filteredUsers.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">No users found.</td></tr>}
                                        {filteredUsers.map(u => (
                                            <tr key={u._id} className="hover:bg-slate-50/80 transition">
                                                <td className="p-4 font-bold text-slate-700">{u.name}</td>
                                                <td className="p-4 text-slate-500 font-mono text-xs">{u.email}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                                                            u.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' :
                                                                u.role === 'developer' ? 'bg-cyan-100 text-cyan-700' :
                                                                    'bg-slate-100 text-slate-600'
                                                        }`}>{u.role}</span>
                                                </td>
                                                <td className="p-4 font-mono text-slate-500 text-xs">{u.schoolId || <span className="text-slate-300">GLOBAL</span>}</td>
                                                <td className="p-4">
                                                    {u.isVerified ? <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-bold">✓ Verified</span> : <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-bold">● Pending</span>}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => openEditModal(u)} className="px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-100">Edit</button>
                                                        <button onClick={() => handleDeleteUser(u._id)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100">Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* === FEEDBACK TAB === */}
                    {!loading && activeTab === 'feedback' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-bold text-slate-800 mb-6">User Feedback Submissions</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {feedbacks.length === 0 && <p className="text-slate-400 italic">No feedback received yet.</p>}
                                {feedbacks.map(f => (
                                    <div key={f._id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:shadow-md transition">
                                        <div className="flex justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">⭐</span>
                                                <span className="text-emerald-600 font-black text-lg">{f.q5}/5</span>
                                            </div>
                                            <span className="text-slate-400 text-xs font-bold bg-white px-2 py-1 rounded border">{new Date(f.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-slate-600 italic bg-white p-3 rounded-xl border border-slate-100 mb-3">"{f.comments || 'No written comment'}"</p>
                                        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                                            <span className="bg-white px-2 py-1 rounded border">Speed: {f.q1}</span>
                                            <span className="bg-white px-2 py-1 rounded border">Accuracy: {f.q2}</span>
                                            <span className="bg-white px-2 py-1 rounded border">UI: {f.q3}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* === SUPPORT TAB === */}
                    {!loading && activeTab === 'support' && (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800">Customer Support Tickets</h2>
                                {/* FILTER BUTTONS */}
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => setTicketFilter('open')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${ticketFilter === 'open' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
                                    <button onClick={() => setTicketFilter('resolved')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${ticketFilter === 'resolved' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Resolved</button>
                                    <button onClick={() => setTicketFilter('all')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${ticketFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>All</button>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {filteredTickets.length === 0 && <p className="text-slate-400 italic">No tickets match this filter.</p>}
                                {filteredTickets.map(t => (
                                    <div key={t._id} className={`bg-white p-5 rounded-2xl border-l-4 shadow-sm hover:shadow-md transition ${t.status === 'resolved' ? 'border-emerald-500 opacity-80' : 'border-amber-500'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${t.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    {t.status === 'resolved' ? '✓' : '?'}
                                                </div>
                                                <div>
                                                    <div className="text-slate-800 font-bold">{t.email}</div>
                                                    <div className="text-slate-400 text-xs font-mono">{t.phone}</div>
                                                </div>
                                            </div>
                                            <span className="text-slate-400 text-xs bg-slate-50 px-2 py-1 rounded">{new Date(t.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm leading-relaxed">
                                            {t.issue}
                                        </div>
                                        <div className="mt-4 flex justify-end gap-2">
                                            {/* ACTION BUTTON */}
                                            {t.status !== 'resolved' ? (
                                                <button onClick={() => handleResolveTicket(t._id)} className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition shadow-sm">Mark Resolved</button>
                                            ) : (
                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">✓ Resolved</span>
                                            )}
                                            <a href={`mailto:${t.email}`} className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-white hover:border-slate-300">Reply Email</a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>

            </div>

            {/* --- MODAL: USER FORM --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white p-8 rounded-2xl w-full max-w-md border border-slate-200 shadow-2xl ring-4 ring-slate-100">
                        {/* TABS IN MODAL */}
                        <div className="flex gap-4 mb-6 border-b border-slate-100 pb-2">
                            <button onClick={() => setModalTab('manual')} className={`text-sm font-bold pb-1 transition ${modalTab === 'manual' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-400'}`}>Manual Entry</button>
                            <button onClick={() => setModalTab('bulk')} className={`text-sm font-bold pb-1 transition ${modalTab === 'bulk' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-400'}`}>Bulk Import</button>
                        </div>

                        {/* FORM CONTENT */}
                        {modalTab === 'manual' ? (
                            <>
                                <h3 className="text-2xl font-black text-slate-800 mb-6">{isEditing ? 'Edit User Profile' : 'Create New User'}</h3>
                                <form onSubmit={handleManualSubmit} className="space-y-4">
                                    <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none" placeholder="Name" value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} required />
                                    <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none" placeholder="Email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} required />
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                                            Password {isEditing && <span className="font-normal normal-case text-slate-400">(Leave blank to keep current)</span>}
                                        </label>
                                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none" type="password" placeholder={isEditing ? "••••••••" : "Password"} value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} required={!isEditing} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none" value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                                            <option value="student">Student</option>
                                            <option value="teacher">Teacher</option>
                                            <option value="admin">Admin</option>
                                            <option value="developer">Developer</option>
                                        </select>
                                        <input
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none text-center font-mono"
                                            placeholder="SCH-ID"
                                            value={userForm.role === 'admin' && !isEditing ? 'Auto-Gen' : userForm.schoolId}
                                            onChange={e => setUserForm({ ...userForm, schoolId: e.target.value })}
                                            disabled={userForm.role === 'admin' && !isEditing}
                                        />
                                    </div>
                                    <div className="flex gap-3 mt-8">
                                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-xl font-bold text-white shadow-lg shadow-cyan-200 transition">{isEditing ? 'Save Changes' : 'Create User'}</button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            // BULK IMPORT UI IN MODAL
                            <div className="flex flex-col items-center justify-center py-4">
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 w-full mb-6 text-center">
                                    <p className="text-xs font-bold text-purple-800 uppercase mb-2">CSV Format</p>
                                    <code className="bg-white px-2 py-1 rounded text-[10px] font-mono text-purple-900 block">Name, Email, Password, Role, SchoolID</code>
                                </div>

                                <label className="block w-full cursor-pointer group mb-6">
                                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center group-hover:border-purple-500 group-hover:bg-purple-50 transition-all">
                                        <span className="text-4xl block mb-2">📄</span>
                                        <span className="text-sm font-bold text-slate-500 group-hover:text-purple-600">
                                            {csvFile ? csvFile.name : "Select CSV File"}
                                        </span>
                                    </div>
                                    <input type="file" accept=".csv" className="hidden" onChange={e => setCsvFile(e.target.files[0])} />
                                </label>

                                <button onClick={handleBulkUpload} className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition">Start Upload</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`.animate-fade-in{animation:f 0.3s ease-out}@keyframes f{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
    );
}

export default DeveloperPanel;