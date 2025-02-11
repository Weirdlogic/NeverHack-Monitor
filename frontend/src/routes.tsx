import { createBrowserRouter } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/dashboard';
import Analysis from './pages/dashboard/analysis';
import SecurityPage from './pages/security';
import WatchlistPage from './pages/dashboard/watchlist';
import MonitorPage from './pages/monitor';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <div className="p-6">Page not found</div>,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'monitor',
        element: <MonitorPage />,
      },
      {
        path: 'analysis',
        element: <Analysis />,
      },
      {
        path: 'security',
        element: <SecurityPage />,
      },
      {
        path: 'watchlist',
        element: <WatchlistPage />,
      }
    ],
  },
]);