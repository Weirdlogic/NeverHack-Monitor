import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleMenuClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black lg:hidden z-20"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`fixed lg:static lg:flex z-30 ${isSidebarOpen ? 'flex' : 'hidden'}`}>
          <Sidebar onClose={() => setIsSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          <Header onMenuClick={handleMenuClick} />
          <main className="flex-1 overflow-auto p-4 lg:p-6 pb-16">
            <div className="container mx-auto max-w-7xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            borderRadius: '0.5rem',
          },
        }}
      />
    </>
  );
};

export default MainLayout;