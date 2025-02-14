import WatchList from '../../components/dashboard/WatchList';
import AddWatchlistItem from '../../components/dashboard/AddWatchlistItem';
import { useState } from 'react';

const WatchlistPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleItemAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Watchlist</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor specific targets and patterns</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <AddWatchlistItem onAdd={handleItemAdded} />
        <div className="mt-6">
          <WatchList key={refreshKey} />
        </div>
      </div>
    </div>
  );
};

export default WatchlistPage;