import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Settings, Menu, X, AlertTriangle, Activity, Server } from 'lucide-react';
import { getApiHealth, getSearchHealth, getLatestMatches } from '../../services/api';
import { useNotificationStore } from '../../store/notifications';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification } from '../../types/notifications';
import StatusIndicator from '../shared/StatusIndicator';
import SearchBar from '../shared/SearchBar';
import { motion, AnimatePresence } from 'framer-motion';
import { Transition } from '@headlessui/react';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  switch (type) {
    case 'watchlist':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'traffic':
      return <Activity className="h-4 w-4 text-yellow-500" />;
    case 'target':
      return <Server className="h-4 w-4 text-blue-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, clearNotification } = useNotificationStore();

  // Initialize notifications system
  useNotifications();

  const { data: apiHealth } = useQuery({
    queryKey: ['apiHealth'],
    queryFn: getApiHealth,
    refetchInterval: 30000
  });

  const { data: searchHealth } = useQuery({
    queryKey: ['searchHealth'],
    queryFn: getSearchHealth,
    refetchInterval: 30000
  });

  // Poll for latest matches (used by useNotifications hook)
  useQuery({
    queryKey: ['latestMatches'],
    queryFn: () => getLatestMatches(5),
    refetchInterval: 10000,
  });

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <header className="relative bg-white border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <button 
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h1 className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              No-Name Monitor by Cybers
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <StatusIndicator 
              status={apiHealth?.status === 'ok' ? 'online' : 'error'} 
              label="API" 
              size="sm" 
            />
            <StatusIndicator 
              status={searchHealth?.status === 'ok' ? 'online' : 'error'} 
              label="Search" 
              size="sm" 
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block w-96">
            <SearchBar />
          </div>
          
          <div className="relative">
            <button 
              className="p-2 hover:bg-gray-100 rounded-full relative"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>

            <div className="absolute right-0 mt-2 w-96 z-50">
              <Transition
                show={showNotifications}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-150"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <div className="rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 p-2 max-h-[80vh] overflow-auto">
                  <div className="flex items-center justify-between p-2 border-b">
                    <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => useNotificationStore.getState().clearAll()}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    <AnimatePresence mode="popLayout">
                      {notifications.length > 0 ? notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 hover:bg-gray-50 rounded-lg cursor-pointer group relative"
                        >
                          <div className="flex items-start gap-3">
                            <NotificationIcon type={notification.type} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-600">{notification.message}</p>
                              {notification.metadata && (
                                <div className="mt-1 text-xs text-gray-400">
                                  {notification.metadata.host && <span>Host: {notification.metadata.host}</span>}
                                  {notification.metadata.pattern && (
                                    <span className="ml-2">Pattern: {notification.metadata.pattern}</span>
                                  )}
                                  {notification.metadata.port && (
                                    <span className="ml-2">Port: {notification.metadata.port}</span>
                                  )}
                                </div>
                              )}
                              <span className="text-xs text-gray-400 mt-1 block">
                                {formatTimeAgo(notification.time)}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                clearNotification(notification.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      )) : (
                        <div className="text-center py-6 text-gray-500 text-sm">
                          No new notifications
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </Transition>
            </div>
          </div>

          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Settings className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Mobile Search */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-3"
          >
            <SearchBar />
            <div className="flex items-center gap-4 mt-3">
              <StatusIndicator 
                status={apiHealth?.status === 'ok' ? 'online' : 'error'} 
                label="API" 
                size="sm" 
              />
              <StatusIndicator 
                status={searchHealth?.status === 'ok' ? 'online' : 'error'} 
                label="Search" 
                size="sm" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;