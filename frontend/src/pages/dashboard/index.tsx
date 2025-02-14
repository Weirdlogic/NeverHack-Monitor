import { useLocation } from 'react-router-dom';
import StatusGrid from '../../components/dashboard/StatusGrid';
import AttackOverview from '../../components/dashboard/AttackTimeline';
import PortHeatmap from '../../components/dashboard/PortHeatmap';
import Analysis from './analysis';
import WatchList from '../../components/dashboard/WatchList';
import { Target } from '../../types/api.types';

const DashboardPage = () => {
  const location = useLocation();
  const selectedTarget = location.state?.selectedTarget as Target;
  const targetDetails = location.state?.targetDetails;

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

      {/* Attack Timeline and Port Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Attack Timeline</h2>
          <AttackOverview />
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Port Distribution</h2>
          <PortHeatmap />
        </div>
      </div>

      {/* Target Analysis */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Target Analysis</h2>
        <Analysis initialTarget={selectedTarget} initialDetails={targetDetails} />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          <button className="text-sm text-blue-600 hover:text-blue-800">View all</button>
        </div>
        <div className="space-y-4">
          <WatchList />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;