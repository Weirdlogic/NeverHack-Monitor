import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart2, Search, Shield, List, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { icon: BarChart2, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Live Monitor', path: '/monitor' },
  { icon: Search, label: 'Analysis', path: '/analysis' },
  { icon: Shield, label: 'Security', path: '/security' },
  { icon: List, label: 'Watchlist', path: '/watchlist' },
];

const Sidebar = () => {
  return (
    <motion.aside 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white h-screen sticky top-0"
    >
      <div className="p-6">
        <nav className="space-y-1.5">
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105' 
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white hover:scale-105'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 pt-8 border-t border-gray-700/50">
          <div className="px-4 py-3 bg-gray-800/50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-300">System Status</h3>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">API Latency</span>
                <span className="text-green-400">24ms</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Memory Usage</span>
                <span className="text-yellow-400">76%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;