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
  Activity
} from 'lucide-react';

const mainNavItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/wallet', icon: Wallet, label: 'Wallet' },
  { to: '/send', icon: Send, label: 'Send' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/recovery', icon: Key, label: 'Recovery' },
];

const bottomNavItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/security', icon: Shield, label: 'Security' },
  { to: '/help', icon: HelpCircle, label: 'Help' },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(3);

  return (
    <div 
      className={`bg-gray-950 min-h-screen relative transition-all duration-300 border-r border-gray-800/50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-gray-800 rounded-full p-1.5 hover:bg-gray-700 transition-colors border border-gray-700/50 shadow-lg shadow-black/20"
      >
        <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${
          isCollapsed ? 'rotate-180' : ''
        }`} />
      </button>

      <div className="p-4">
        <div className="flex items-center space-x-3 mb-8 px-4 py-3">
          <div className="relative">
            <Wallet className="w-8 h-8 text-blue-500" />
            <Activity className="w-3 h-3 text-emerald-400 absolute -top-1 -right-1" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-emerald-400 bg-clip-text text-transparent">
                PyGUI Wallet
              </span>
              <div className="text-xs text-emerald-500">Connected</div>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {mainNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 relative group ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`
              }
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                isCollapsed ? 'mx-auto' : ''
              }`} />
              {!isCollapsed && (
                <span className="font-medium tracking-wide">{label}</span>
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 mb-4">
          {!isCollapsed && (
            <div className="px-4 text-xs font-medium text-gray-500 tracking-wider">
              TOOLS
            </div>
          )}
        </div>

        <div className="relative">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 transition-all duration-200 group">
            <Bell className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
            {!isCollapsed && <span className="font-medium tracking-wide">Notifications</span>}
            {notifications > 0 && (
              <span className="absolute right-4 top-3 bg-gradient-to-r from-blue-500 to-emerald-400 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-blue-500/20">
                {notifications}
              </span>
            )}
          </button>
        </div>

        <div className="absolute bottom-8 left-0 right-0 px-4">
          <div className="space-y-1">
            {bottomNavItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-gray-800/80 text-gray-200'
                      : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'
                  }`
                }
              >
                <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                  isCollapsed ? 'mx-auto' : ''
                }`} />
                {!isCollapsed && <span className="font-medium tracking-wide">{label}</span>}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}