import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

const MainLayout = () => {
  return (
    <>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-6 pb-16">
            <div className="container mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
};

export default MainLayout;