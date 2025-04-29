import AttackOverview from '../../components/dashboard/AttackTimeline';
import PortHeatmap from '../../components/dashboard/PortHeatmap';

const StatsPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stats</h1>
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Attack Timeline</h2>
        <AttackOverview />
      </div>
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Port Heatmap</h2>
        <PortHeatmap />
      </div>
    </div>
  );
};

export default StatsPage;