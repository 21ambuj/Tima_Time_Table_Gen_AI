import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Using the context we created
import InstallPWA from '../components/InstallPWA';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Use Global Auth State
  const [showCookieConsent, setShowCookieConsent] = useState(false);

  // --- COOKIE HELPERS ---
  const setCookie = (name, value, days) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  };

  const getCookie = (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // 1. Check Cookie Consent on Load
  useEffect(() => {
    const consent = getCookie('cookieConsent');
    if (!consent) {
      setShowCookieConsent(true);
    }
  }, []);


  // 2. Handle Cookie Accept
  const acceptCookies = () => {
    setCookie('cookieConsent', 'true', 365); // Save as a real cookie for 1 year
    setShowCookieConsent(false);
  };

  // 3. Navigation Logic
  const handleDashboardNavigation = () => {
    if (!user) return navigate('/login');
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'teacher') navigate('/teacher-dashboard');
    else navigate('/student-dashboard');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 selection:bg-indigo-500 selection:text-white flex flex-col">

      {/* ================= HEADER ================= */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
            </div>
            <span className="text-xl font-bold tracking-tight ">
              <span className="text-indigo-600">Tima</span>
              <span className="text-slate-800"> - Timetable </span>
              <Link to="https://chatiqai.netlify.app/" className="
  px-2
  text-white 
  font-bold 
  rounded-full 
  shadow-lg 
  bg-gradient-to-r from-indigo-600 to-purple-600
  hover:from-indigo-700 hover:to-purple-700
  transition transform hover:-translate-y-4
">
                GENAI
              </Link>

            </span>
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-6">
            <a href="#features" className="hidden md:block text-sm font-medium text-slate-500 hover:text-indigo-600 transition">Features</a>
            <a href="#how-it-works" className="hidden md:block text-sm font-medium text-slate-500 hover:text-indigo-600 transition">How it Works</a>
            <InstallPWA />

            {user ? (
              <div className="flex items-center gap-4">
                <span className="hidden md:block text-sm text-slate-600">
                  Welcome, <span className="font-bold text-slate-900">{user.name}</span>
                </span>
                <button onClick={logout} className="text-sm font-bold text-red-500 hover:text-red-700 transition">
                  Logout
                </button>
                <button
                  onClick={handleDashboardNavigation}
                  className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition">
                  Login
                </Link>
                {/* Fixed: Point to /login since Auth page handles both login/signup */}
                <Link to="/login" className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ================= HERO SECTION ================= */}
      <header className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-100/50 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            🚀 NEP 2020 Compliant Scheduler
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-tight">
            Intelligent Scheduling <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Made Effortless.</span>
          </h1>
          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Generate conflict-free timetables for universities and schools in seconds.
            Powered by advanced genetic algorithms to optimize resource allocation.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              // Fixed: Point to /login instead of /signup
              onClick={user ? handleDashboardNavigation : () => navigate('/login')}
              className="px-8 py-4 bg-slate-900 text-white text-lg font-bold rounded-xl hover:bg-slate-800 transition shadow-xl hover:-translate-y-1"
            >
              {user ? 'Go to Console' : 'Start Generating Now'}
            </button>
            <a href="#features" className="px-8 py-4 bg-white border border-slate-200 text-slate-700 text-lg font-bold rounded-xl hover:bg-slate-50 transition shadow-sm">
              View Features
            </a>
          </div>
        </div>
      </header>

      {/* ================= FEATURES GRID ================= */}
      <section id="features" className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Complete Management Suite</h2>
            <p className="text-slate-500">Everything you need to run your institution smoothly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Feature 1 - Add Classroom */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-100 transition hover:shadow-xl hover:shadow-blue-100 group">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                🏫
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Classroom Management</h3>
              <p className="text-slate-500 leading-relaxed">
                Add and manage classrooms, labs, and halls with capacity and equipment details for accurate schedule planning.
              </p>
            </div>

            {/* Feature 2 - Add Subjects */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-rose-100 transition hover:shadow-xl hover:shadow-rose-100 group">
              <div className="w-12 h-12 bg-rose-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                📚
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Curriculum Management</h3>
              <p className="text-slate-500 leading-relaxed">
                Add subject names, codes, credits, and assign faculty to ensure your timetable remains clean and structured.
              </p>
            </div>

            {/* Feature 3 - Add Sections */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-teal-100 transition hover:shadow-xl hover:shadow-teal-100 group">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                🧩
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Academic Structure</h3>
              <p className="text-slate-500 leading-relaxed">
                Create sections like K23-1 to K23-10 and group students for optimized scheduling across all semesters.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-purple-100 transition hover:shadow-xl hover:shadow-purple-100 group">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                👩‍🏫
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Faculty Management</h3>
              <p className="text-slate-500 leading-relaxed">
                Manage teacher workloads, assign specific subjects, and generate UID badges automatically.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-100 transition hover:shadow-xl hover:shadow-emerald-100 group">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                🏫
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Resource Optimization</h3>
              <p className="text-slate-500 leading-relaxed">
                Prevent double-booking of labs and lecture halls. Optimize space usage across the entire campus.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition hover:shadow-xl hover:shadow-indigo-100 group">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">AI Engine</h3>
              <p className="text-slate-500 leading-relaxed">
                Our genetic algorithm processes thousands of constraints (rooms, teachers, credits) to find the perfect schedule.
              </p>
            </div>

          </div>
        </div>
      </section>


      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="py-24 bg-slate-900 text-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="md:w-1/2">
              <h2 className="text-4xl font-black mb-6">How It Works</h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Input Data</h4>
                    <p className="text-slate-400">Add your teachers, subjects, and classrooms manually or via CSV bulk upload.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Configure Sections</h4>
                    <p className="text-slate-400">Define the number of classes (e.g., K23-1 to K23-10) you need schedules for.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold shrink-0">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Generate & Publish</h4>
                    <p className="text-slate-400">Click generate. The AI builds the schedule. Save it to instantly update Student & Teacher portals.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 bg-white/5 backdrop-blur-sm border border-white/10 p-8 rounded-3xl">
              <div className="space-y-4">
                <div className="h-4 bg-white/20 rounded w-3/4"></div>
                <div className="h-4 bg-white/20 rounded w-1/2"></div>
                <div className="h-32 bg-indigo-600/20 rounded-xl border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-mono">
                  AI Processing...
                </div>
                <div className="h-4 bg-white/20 rounded w-full"></div>
                <div className="h-4 bg-white/20 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <span className="text-xl font-bold tracking-tight ">
              <span className="text-indigo-600">Tima</span>
              <span className="text-slate-800"> - Timetable </span>
              <button className="
  px-2
  text-white 
  font-bold 
  rounded-full 
  shadow-lg 
  bg-gradient-to-r from-indigo-600 to-purple-600
  hover:from-indigo-700 hover:to-purple-700
  transition transform hover:-translate-y-4
">
                GENAI
              </button>

            </span>
            <p className="text-sm text-slate-500 mt-2">© 2025 Tima Academic Solution Inc.</p>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-500">
            <Link to="/privacy-policy" className="hover:text-indigo-600">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-indigo-600">Terms of Service</Link>
            <Link to="/contact-support" className="hover:text-indigo-600">Contact Support</Link>
            <Link to="/feedback" className="hover:text-indigo-600">Feedback</Link>
            <Link to="/About" className="hover:text-indigo-600">About Developer</Link>
          </div>
          {/* UPDATED: Contact Links */}
          <div className="flex gap-4">
            {/* Email */}
            <a href="mailto:ambuj20maurya@gmail.com" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition" title="Email Us">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </a>

            {/* LinkedIn */}
            <a href="https://linkedin.com/in/21ambuj" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition" title="LinkedIn">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
            </a>

            {/* Phone */}
            <a href="tel:+919369572534" className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 transition" title="Call Us">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            </a>
          </div>
        </div>
      </footer>

      {/* ================= COOKIE CONSENT BANNER ================= */}
      {showCookieConsent && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-indigo-100 p-6 shadow-2xl z-50 animate-fade-in-up">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🍪</div>
              <div>
                <h4 className="font-bold text-slate-800">We use cookies</h4>
                <p className="text-sm text-slate-500 max-w-xl">
                  We use cookies to ensure you get the best experience, including secure login sessions and saving your preferences.
                  By continuing, you agree to our use of cookies.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCookieConsent(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">
                Decline
              </button>
              <button onClick={acceptCookies} className="px-8 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default Home;