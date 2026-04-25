import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Wallet,
  Send,
  History,
  Key,
  ChevronLeft,
  Settings,
  HelpCircle,
  Bell,
  Shield,
  Activity,
  Layers,
  ShoppingBag,
  Calculator,
} from 'lucide-react';

const mainNavItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/send', icon: Send, label: 'Send' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/recovery', icon: Key, label: 'Recovery' },
  { to: '/pool', icon: Layers, label: 'Recovery Pool' },
  { to: '/marketplace', icon: ShoppingBag, label: 'NFT Market' },
  { to: '/keys', icon: Shield, label: 'Keys & Contracts' },
  { to: '/calculator', icon: Calculator, label: 'Key Calculator' },
];

const bottomNavItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/security', icon: Shield, label: 'Security' },
  { to: '/help', icon: HelpCircle, label: 'Help' },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications] = useState(3);

  return (
    <div
      className={`relative transition-all duration-300 border-r border-purple-500/10 ${isCollapsed ? 'w-20' : 'w-72'
        }`}
      style={{
        background: 'linear-gradient(180deg, rgba(17,24,39,0.95) 0%, rgba(10,15,30,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        minHeight: '100vh',
      }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 60%)',
      }} />

      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 p-1.5 rounded-full transition-all duration-300 z-10 hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 0 10px rgba(139,92,246,0.2)',
        }}
      >
        <ChevronLeft className={`w-3.5 h-3.5 text-purple-300 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''
          }`} />
      </button>

      <div className="relative p-4">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8 px-3 py-4 rounded-xl" style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(6,182,212,0.05))',
          border: '1px solid rgba(139,92,246,0.1)',
        }}>
          <div className="relative">
            <div className="absolute inset-0 blur-lg bg-purple-500/40 rounded-full animate-pulse-slow" />
            <Wallet className="w-9 h-9 text-purple-400 relative" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-xl font-bold text-gradient">PyGUI Wallet</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <div className="text-xs text-emerald-400/80 font-medium">Connected</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="space-y-1">
          {mainNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
            >
              {({ isActive }) => (
                <div
                  className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 relative group cursor-pointer ${isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                    }`}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))',
                    border: '1px solid rgba(139,92,246,0.3)',
                    boxShadow: '0 0 15px rgba(139,92,246,0.1)',
                  } : {
                    border: '1px solid transparent',
                  }}
                >
                  <Icon className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${isCollapsed ? 'mx-auto' : ''
                    } ${isActive ? 'text-purple-400' : ''}`} />
                  {!isCollapsed && (
                    <span className="font-medium text-sm tracking-wide">{label}</span>
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full" style={{
                      background: 'linear-gradient(180deg, #8b5cf6, #06b6d4)',
                      boxShadow: '0 0 10px rgba(139,92,246,0.5)',
                    }} />
                  )}
                  {!isCollapsed && (
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(6,182,212,0.05))',
                    }} />
                  )}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Notifications */}
        <div className="mt-6">
          <div
            className={`flex items-center space-x-3 px-3 py-3 rounded-xl text-gray-400 hover:text-gray-200 transition-all duration-200 cursor-pointer relative group`}
            style={{ border: '1px solid transparent' }}
          >
            <div className="relative">
              <Bell className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-gradient-to-r from-purple-500 to-cyan-400 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {notifications}
                </span>
              )}
            </div>
            {!isCollapsed && <span className="font-medium text-sm">Notifications</span>}
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <div className="space-y-1">
            {bottomNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
              >
                {({ isActive }) => (
                  <div
                    className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${isActive ? 'text-gray-200' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    style={isActive ? {
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.15)',
                    } : { border: '1px solid transparent' }}
                  >
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isCollapsed ? 'mx-auto' : ''
                      }`} />
                    {!isCollapsed && <span className="font-medium text-sm">{label}</span>}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
