import { useLocation } from 'react-router-dom';
import StatusGrid from '../../components/dashboard/StatusGrid';
import AttackOverview from '../../components/dashboard/AttackTimeline';
import PortHeatmap from '../../components/dashboard/PortHeatmap';
import WatchList from '../../components/dashboard/WatchList';

const DashboardPage = () => {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor your security in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Last 24 hours
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Status Grid */}
      <StatusGrid />

      {/* Primary Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attack Timeline - Takes 2/3 width */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Attack Timeline</h2>
          <AttackOverview />
        </div>
        
        {/* Recent Alerts - Takes 1/3 width */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
          <WatchList />
        </div>
      </div>

      {/* Bottom Section - Port Distribution (Smaller) */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Port Distribution</h2>
          <button className="text-sm text-blue-600 hover:text-blue-800">View Details</button>
        </div>
        <div className="h-[200px]"> {/* Reduced height */}
          <PortHeatmap />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;