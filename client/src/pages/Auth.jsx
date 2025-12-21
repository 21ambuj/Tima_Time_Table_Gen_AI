import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  // Views: 'login', 'signup', 'verify-signup', 'forgot-request', 'forgot-reset'
  const [view, setView] = useState('login');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'student',
    schoolId: '', // School ID State
    otp: '', newPassword: ''
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // --- VALIDATION LOGIC ---
  const validate = () => {
    // Login Validation
    if (view === 'login') {
      if (!formData.email || !formData.password) return "Please enter email and password.";
    }

    // Signup Validation
    if (view === 'signup') {
      if (!formData.name || !formData.email || !formData.password) return "All fields are required.";
      if (formData.password.length < 6) return "Password must be at least 6 characters.";

      // School ID Check (Required for non-admins)
      if (formData.role !== 'admin' && !formData.schoolId) {
        return "Please enter the School Code provided by your Admin.";
      }
    }

    // OTP / Reset Validation
    if (view === 'verify-signup' && !formData.otp) return "Please enter the OTP sent to your email.";
    if (view === 'forgot-request' && !formData.email) return "Please enter your registered email.";
    if (view === 'forgot-reset') {
      if (!formData.otp) return "OTP is required.";
      if (!formData.newPassword) return "New Password is required.";
      if (formData.newPassword.length < 6) return "New password must be at least 6 characters.";
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      // 1. LOGIN
      if (view === 'login') {
        const user = await login(formData.email, formData.password);

        // Redirect Logic
        if (user.role === 'developer') navigate('/dev');
        else if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'teacher') navigate('/teacher-dashboard');
        else if (user.role === 'student') navigate('/student-dashboard');

        // 2. SIGNUP (Request OTP)
      } else if (view === 'signup') {
        await axios.post('http://localhost:5000/api/auth/register', formData);
        setSuccess('Account created! OTP sent to your email.');
        setTimeout(() => {
          setView('verify-signup');
          setSuccess('');
        }, 1500);

        // 3. VERIFY SIGNUP OTP
      } else if (view === 'verify-signup') {
        await axios.post('http://localhost:5000/api/auth/verify-signup', { email: formData.email, otp: formData.otp });
        setSuccess('Verification successful! Logging you in...');
        setTimeout(() => {
          setView('login');
          setSuccess('');
          setFormData(prev => ({ ...prev, otp: '', password: '' }));
        }, 2000);

        // 4. FORGOT PASSWORD REQUEST
      } else if (view === 'forgot-request') {
        await axios.post('http://localhost:5000/api/auth/forgot-password', { email: formData.email });
        setSuccess(`OTP sent to ${formData.email}`);
        setTimeout(() => { setView('forgot-reset'); setSuccess(''); }, 1500);

        // 5. RESET PASSWORD
      } else if (view === 'forgot-reset') {
        await axios.post('http://localhost:5000/api/auth/reset-password', {
          email: formData.email,
          otp: formData.otp,
          newPassword: formData.newPassword
        });
        setSuccess('Password changed successfully! Please login.');
        setTimeout(() => {
          setView('login');
          setSuccess('');
          setFormData({ ...formData, password: '', otp: '', newPassword: '' });
        }, 2000);
      }

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Action failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to switch views cleanly
  const switchView = (v) => {
    setView(v);
    setError('');
    setSuccess('');
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#f3f4f6] font-sans relative overflow-hidden">

      {/* Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-200/50 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-200/50 rounded-full blur-[100px]"></div>

      {/* --- BACK TO HOME BUTTON --- */}
      <Link to="/" className="absolute top-8 left-8 z-50 flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition">
        <span>←</span> Back to Home
      </Link>

      <div className="relative w-[900px] max-w-full min-h-[550px] bg-white rounded-2xl shadow-2xl overflow-hidden m-4 transition-all duration-500">

        {/* --- SIGN UP FORM --- */}
        <div className={`absolute top-0 h-full transition-all duration-700 ease-in-out left-0 w-1/2 ${view === 'signup' ? 'opacity-100 z-20 translate-x-full' : 'opacity-0 z-10'}`}>
          <form className="bg-white flex flex-col items-center justify-center h-full px-12 text-center" onSubmit={handleSubmit}>
            <h1 className="font-extrabold text-3xl mb-4 text-gray-800">Create Account</h1>

            <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" />

            <select name="role" onChange={handleChange} value={formData.role} className="bg-gray-50 border border-gray-200 py-3 px-4 w-full rounded-lg outline-none cursor-pointer text-gray-600 text-sm mt-2">
              <option value="student">Student</option>
              <option value="teacher">Teacher / Faculty</option>
              <option value="admin">Administrator</option>
            </select>

            {/* SCHOOL ID INPUT (Only for Non-Admins) */}
            {formData.role !== 'admin' && (
              <div className="w-full mt-2">
                <input
                  type="text"
                  name="schoolId"
                  placeholder="School Code (e.g. SCH-1234)"
                  value={formData.schoolId}
                  onChange={handleChange}
                  className="bg-indigo-50 border-2 border-indigo-100 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-center font-bold tracking-widest text-indigo-700 placeholder-indigo-300"
                />
                <p className="text-[10px] text-gray-400 mt-1">Ask your admin for the code</p>
              </div>
            )}

            {error && <p className="text-red-500 text-xs mt-3 bg-red-50 px-2 py-1 rounded w-full border border-red-100">{error}</p>}

            <button disabled={loading} className="mt-6 bg-indigo-600 text-white font-bold py-3 px-12 rounded-full uppercase tracking-wider text-sm transform transition-transform active:scale-95 hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200">
              {loading ? 'Processing...' : 'Sign Up'}
            </button>
          </form>
        </div>

        {/* --- LOGIN FORM --- */}
        <div className={`absolute top-0 h-full transition-all duration-700 ease-in-out left-0 w-1/2 z-20 ${view === 'login' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
          <form className="bg-white flex flex-col items-center justify-center h-full px-12 text-center" onSubmit={handleSubmit}>
            <h1 className="font-extrabold text-3xl mb-4 text-gray-800">Sign In</h1>

            <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition" />

            <button type="button" onClick={() => switchView('forgot-request')} className="mt-2 mb-4 text-xs text-gray-500 hover:text-indigo-600 transition border-b border-transparent hover:border-indigo-600">
              Forgot your password?
            </button>

            {error && <p className="text-red-500 text-xs mt-2 bg-red-50 px-2 py-1 rounded w-full border border-red-100">{error}</p>}
            {success && <p className="text-green-500 text-xs mt-2 bg-green-50 px-2 py-1 rounded w-full border border-green-100">{success}</p>}

            <button disabled={loading} className="bg-indigo-600 text-white font-bold py-3 px-12 rounded-full uppercase tracking-wider text-sm transform transition-transform active:scale-95 hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 mt-2">
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* --- OVERLAY FOR VERIFY / FORGOT --- */}
        <div className={`absolute top-0 h-full w-1/2 z-30 bg-white transition-all duration-500 ease-in-out ${['forgot-request', 'forgot-reset', 'verify-signup'].includes(view) ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'}`}>
          <div className="flex flex-col items-center justify-center h-full px-12 text-center">

            {/* VERIFY SIGNUP VIEW */}
            {view === 'verify-signup' && (
              <>
                <h1 className="font-extrabold text-2xl mb-2 text-gray-800">Verify Account</h1>
                <p className="text-sm text-gray-500 mb-6">Enter the OTP sent to <strong>{formData.email}</strong></p>
                <input type="text" name="otp" placeholder="Enter 6-digit OTP" value={formData.otp} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-center tracking-widest font-mono" maxLength="6" />
                <button onClick={handleSubmit} disabled={loading} className="mt-4 bg-green-600 text-white font-bold py-3 px-8 rounded-full text-sm hover:bg-green-700 transition w-full shadow-lg">
                  {loading ? 'Verifying...' : 'Confirm OTP'}
                </button>
              </>
            )}

            {/* FORGOT PASSWORD REQUEST VIEW */}
            {view === 'forgot-request' && (
              <>
                <h1 className="font-extrabold text-2xl mb-2 text-gray-800">Reset Password</h1>
                <p className="text-sm text-gray-500 mb-6">Enter your registered email to receive an OTP.</p>
                <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={handleSubmit} disabled={loading} className="mt-4 bg-purple-600 text-white font-bold py-3 px-8 rounded-full text-sm hover:bg-purple-700 transition w-full shadow-lg">
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </>
            )}

            {/* FORGOT PASSWORD RESET VIEW */}
            {view === 'forgot-reset' && (
              <>
                <h1 className="font-extrabold text-2xl mb-2 text-gray-800">New Password</h1>
                <p className="text-sm text-gray-500 mb-6">Enter OTP and your new password.</p>
                <input type="text" name="otp" placeholder="OTP Code" value={formData.otp} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg text-center tracking-widest" />
                <input type="password" name="newPassword" placeholder="New Password" value={formData.newPassword} onChange={handleChange} className="bg-gray-50 border border-gray-200 my-2 py-3 px-4 w-full rounded-lg" />
                <button onClick={handleSubmit} disabled={loading} className="mt-4 bg-green-600 text-white font-bold py-3 px-8 rounded-full text-sm hover:bg-green-700 transition w-full shadow-lg">
                  {loading ? 'Updating...' : 'Set Password'}
                </button>
              </>
            )}

            {/* Back Button */}
            <button onClick={() => switchView('login')} className="mt-6 text-xs font-bold text-gray-400 hover:text-gray-600">
              Cancel & Back to Login
            </button>

            {error && <p className="text-red-500 text-xs mt-4 bg-red-50 px-2 py-1 rounded w-full border border-red-100">{error}</p>}
            {success && <p className="text-green-500 text-xs mt-4 bg-green-50 px-2 py-1 rounded w-full border border-green-100">{success}</p>}
          </div>
        </div>

        {/* --- OVERLAY ANIMATION CONTAINER --- */}
        <div className={`absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-50 ${view === 'signup' ? '-translate-x-full' : ''}`}>
          <div className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative -left-full h-full w-[200%] transform transition-transform duration-700 ease-in-out ${view === 'signup' ? 'translate-x-1/2' : 'translate-x-0'}`}>

            {/* Left Panel (Visible during Login) */}
            <div className={`absolute top-0 flex flex-col items-center justify-center h-full w-1/2 px-12 text-center transform transition-transform duration-700 ease-in-out ${view === 'signup' ? 'translate-x-0' : '-translate-x-[20%]'}`}>
              <h1 className="font-bold text-4xl mb-4">Welcome Back!</h1>
              <p className="mb-8 text-sm leading-relaxed text-indigo-100">
                To keep connected with your personal timetable and updates, please login with your personal info.
              </p>
              <button
                onClick={() => switchView('login')}
                className={`bg-transparent border-2 border-white text-white font-bold py-2 px-10 rounded-full uppercase tracking-wider hover:bg-white hover:text-indigo-600 transition-colors text-sm ${view !== 'signup' ? 'hidden' : ''}`}
              >
                Sign In
              </button>
            </div>

            {/* Right Panel (Visible during Signup) */}
            <div className={`absolute top-0 right-0 flex flex-col items-center justify-center h-full w-1/2 px-12 text-center transform transition-transform duration-700 ease-in-out ${view === 'signup' ? 'translate-x-[20%]' : 'translate-x-0'}`}>
              <h1 className="font-bold text-4xl mb-4">Join Us!</h1>
              <p className="mb-8 text-sm leading-relaxed text-purple-100">
                Start your journey with our AI-powered scheduling system.
              </p>
              <button onClick={() => switchView('signup')} className="bg-transparent border-2 border-white text-white font-bold py-2 px-10 rounded-full uppercase tracking-wider hover:bg-white hover:text-purple-600 transition-colors text-sm">
                Sign Up
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Auth;