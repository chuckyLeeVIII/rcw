import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{
      background: '#0a0f1e',
    }}>
      {/* Mesh gradient background */}
      <div className="fixed inset-0 mesh-gradient" />
      {/* Subtle grid pattern overlay */}
      <div className="fixed inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      {/* Ambient orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 lg:p-8 mesh-gradient">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
