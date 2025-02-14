import StatusGrid from '../../components/dashboard/StatusGrid';
import AttackOverview from '../../components/dashboard/AttackTimeline';
import PortHeatmap from '../../components/dashboard/PortHeatmap';
import DashboardWatchlist from '../../components/dashboard/DashboardWatchlist';

const DashboardPage = () => {
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Section - Takes 3/4 width */}
        <div className="lg:col-span-3 space-y-6">
          {/* Attack Timeline */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Attack Timeline</h2>
            <AttackOverview />
          </div>
          
          {/* Port Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Port Distribution</h2>
              <button className="text-sm text-blue-600 hover:text-blue-800">View Details</button>
            </div>
            <div className="h-[160px]">
              <PortHeatmap />
            </div>
          </div>
        </div>
        
        {/* Right Section - Takes 1/4 width */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Alerts</h2>
          <DashboardWatchlist />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;