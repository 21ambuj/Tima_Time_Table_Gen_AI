import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
// NEW: Import all from single file
import { PrivacyPolicy, TermsOfService, ContactSupport, Feedback } from './pages/SupportPages';

// 1. IMPORT THE AUTH CONTEXT (The brain of the login system)
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import RouteTransition from './components/RouteTransition';

// 2. IMPORT ALL YOUR PAGES
import Login from './pages/Auth';


// Dashboards
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import StudentPortal from './pages/StudentPortal';
import TeacherPortal from './pages/TeacherPortal';

// Admin Features 
import Teachers from './pages/Teachers';
import Subjects from './pages/Subjects';
import Classrooms from './pages/Classrooms';
import Generate from './pages/Generate';
import Sections from './pages/Sections';

import DeveloperPanel from './pages/DeveloperPanel';
import About from './pages/About';

// 3. PROTECTED ROUTE COMPONENT
// This checks: "Is the user logged in? Do they have the right role?"
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  // If not logged in, kick them to login page
  if (!user) return <Navigate to="/login" />;

  // If logged in but wrong role (e.g. Student trying to access Admin), kick them to Home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

// 4. DEFINE ALL ROUTES
function AppRoutes() {
  return (
    <>
      <RouteTransition />
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        {/* <Route path="/signup" element={<Signup />} /> */}

        {/* LEGAL & SUPPORT */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/contact-support" element={<ContactSupport />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/About" element={<About />} />

        {/* DEVELOPER */}
        <Route path="/dev" element={<ProtectedRoute allowedRoles={['developer']}><DeveloperPanel /></ProtectedRoute>} />


        {/* --- ADMIN ONLY ROUTES --- */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/teachers" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Teachers />
          </ProtectedRoute>
        } />

        <Route path="/subjects" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Subjects />
          </ProtectedRoute>
        } />

        <Route path="/rooms" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Classrooms />
          </ProtectedRoute>
        } />

        <Route path="/sections" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Sections />
          </ProtectedRoute>
        } />

        <Route path="/generate" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Generate />
          </ProtectedRoute>
        } />

        {/* --- TEACHER ONLY ROUTES --- */}
        <Route path="/teacher-dashboard" element={
          <ProtectedRoute allowedRoles={['teacher']}>
            <TeacherPortal />
          </ProtectedRoute>
        } />

        {/* --- STUDENT ONLY ROUTES --- */}
        <Route path="/student-dashboard" element={
          <ProtectedRoute allowedRoles={['student']}>
            <StudentPortal />
          </ProtectedRoute>
        } />

        {/* Redirect old links to new dashboards */}
        <Route path="/teacher-portal" element={<Navigate to="/teacher-dashboard" />} />
        <Route path="/student-portal" element={<Navigate to="/student-dashboard" />} />
      </Routes>
    </>
  );
}

// 5. MAIN APP WRAPPER
function App() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LoadingProvider>
  );
}

export default App;