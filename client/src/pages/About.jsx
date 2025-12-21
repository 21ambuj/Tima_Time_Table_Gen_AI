import React from "react";
import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Background FX */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-50/50 rounded-full blur-[100px]"></div>
      </div>

      <div className="relative z-10">
          {/* Header */}
          <div className="max-w-6xl mx-auto px-6 py-16 animate-fade-in-up">
            <Link to="/" className="inline-block mb-6 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition">
                ← Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
              About <span className="text-indigo-600">Tima</span>
            </h1>
            <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
              Tima is an AI-powered timetable generation platform designed to simplify
              academic scheduling for schools and universities.
            </p>
          </div>

          {/* About Project */}
          <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
              <h2 className="text-2xl font-bold mb-4 text-slate-900">What is Tima?</h2>
              <p className="text-slate-600 leading-relaxed">
                Tima uses intelligent algorithms to generate conflict-free timetables
                by considering classrooms, faculty availability, subjects, credits,
                and institutional constraints. It is fully compliant with NEP 2020
                guidelines and supports multi-school administration.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
              <h2 className="text-2xl font-bold mb-4 text-slate-900">Key Features</h2>
              <ul className="space-y-3 text-slate-600 list-none">
                {[
                  "AI-based timetable generation",
                  "Student, Teacher & Admin dashboards",
                  "CSV bulk upload support",
                  "Multi-school & role-based access",
                  "Fast, scalable & secure"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="text-indigo-500 text-lg">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Founder Section */}
          <section className="bg-slate-50/80 backdrop-blur-sm py-16 border-y border-slate-100 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
              
              <div>
                <h2 className="text-2xl font-bold mb-4 text-slate-900">About the Developer</h2>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Hi, I’m <span className="font-bold text-indigo-600">Ambuj Maurya</span>,
                  a full-stack developer passionate about building scalable education
                  technology solutions. Tima is built to solve real-world academic
                  scheduling problems using modern web technologies and AI concepts.
                </p>
              </div>

              <div className="space-y-4 text-slate-600 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <p className="flex items-center gap-3">
                  <span className="text-2xl">📧</span>
                  <a
                    href="mailto:ambuj20maurya@gmail.com"
                    className="text-slate-700 font-semibold hover:text-indigo-600 transition"
                  >
                    ambuj20maurya@gmail.com
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-2xl">🔗</span>
                  <a
                    href="https://linkedin.com/in/21ambuj"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 font-semibold hover:text-indigo-600 transition"
                  >
                    linkedin.com/in/21ambuj
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-2xl">📞</span>
                  <a
                    href="tel:+919369572534"
                    className="text-slate-700 font-semibold hover:text-indigo-600 transition"
                  >
                    +91 93695 72534
                  </a>
                </p>
              </div>

            </div>
          </section>

          {/* Footer CTA */}
          <div className="max-w-6xl mx-auto px-6 py-24 text-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <h3 className="text-3xl font-black mb-6 text-slate-900">
              Ready to experience intelligent scheduling?
            </h3>
            <Link
              to="/login"
              className="inline-block px-10 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Get Started Now
            </Link>
          </div>
      </div>

      <style>{`
        .animate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
        .animate-fade-in { opacity: 0; animation: fadeIn 0.8s ease-out forwards; }
        
        @keyframes fadeInUp { 
            from { opacity: 0; transform: translateY(20px); } 
            to { opacity: 1; transform: translateY(0); } 
        }
        @keyframes fadeIn { 
            from { opacity: 0; } 
            to { opacity: 1; } 
        }
      `}</style>

    </div>
  );
};

export default About;