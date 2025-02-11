import WatchList from '../../components/dashboard/WatchList';

const WatchlistPage = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Watchlist</h1>
        <WatchList />
      </div>
    </div>
  );
};

export default WatchlistPage;