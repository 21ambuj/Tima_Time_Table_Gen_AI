import React from 'react';
import { createPortal } from 'react-dom';

const Loader = ({ message = "Processing..." }) => {
  // Uses a Portal to render outside the root DOM hierarchy
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a', // Solid Dark Slate 900
        zIndex: 999999, // Super high z-index
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.3s ease-in-out'
      }}
    >

      {/* Animation Core */}
      <div className="relative flex items-center justify-center w-64 h-64 mb-8">
        {/* Rings */}
        <div className="absolute w-40 h-40 border-[4px] border-transparent border-t-cyan-500 border-r-cyan-500 rounded-full animate-spin-slow shadow-[0_0_30px_rgba(6,182,212,0.6)]"></div>
        <div className="absolute w-32 h-32 border-[4px] border-transparent border-b-purple-500 border-l-purple-500 rounded-full animate-spin-reverse shadow-[0_0_30px_rgba(168,85,247,0.6)]"></div>
        {/* Center Pulse */}
        <div className="absolute w-4 h-4 bg-white rounded-full animate-ping"></div>
      </div>

      {/* Text */}
      <div className="text-center z-10 space-y-4">
        <h2 className="text-5xl font-black text-white md:text-transparent md:bg-clip-text md:bg-gradient-to-r md:from-cyan-400 md:via-white md:to-purple-400 tracking-tighter" style={{ textShadow: '0 0 30px rgba(6,182,212,0.5)' }}>
          Tima AI
        </h2>

        <div className="inline-block px-6 py-2 rounded-full border border-slate-600 bg-slate-800/50 backdrop-blur-md">
          <p className="text-cyan-300 font-mono text-xs font-bold tracking-[0.2em] uppercase animate-pulse">
            {message}
          </p>
        </div>
      </div>

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        .animate-spin-reverse { animation: spinReverse 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinReverse { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
      `}</style>
    </div>,
    document.body
  );
};

export default Loader;