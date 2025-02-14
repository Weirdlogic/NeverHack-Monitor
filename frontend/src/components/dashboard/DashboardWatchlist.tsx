import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Activity, Shield } from 'lucide-react';
import { getWatchlistItems } from '../../services/api';
import { Link } from 'react-router-dom';

interface WatchlistItem {
  id: number;
  pattern: string;
  severity: string;
  last_match?: string;
  match_count?: number;
}

// Compact version specifically for dashboard widget
const DashboardWatchlist = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getWatchlistItems();
        const sortedItems = data
          .sort((a, b) => (b.match_count || 0) - (a.match_count || 0))
          .slice(0, 5);
        setItems(sortedItems);
      } catch (error) {
        console.error('Error fetching watchlist:', error);
      }
    };

    fetchItems();
    const interval = setInterval(fetchItems, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Activity className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
          >
            {getSeverityIcon(item.severity)}
            <div className="min-w-0 flex-1">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium truncate">{item.pattern}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.severity === 'high' 
                    ? 'bg-red-100 text-red-700'
                    : item.severity === 'medium'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {item.match_count || 0} matches
                </span>
              </div>
              {item.last_match && (
                <p className="text-xs text-gray-500 mt-1">
                  Last match: {new Date(item.last_match).toLocaleTimeString()}
                </p>
              )}
            </div>
          </motion.div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No alerts
          </div>
        )}
      </AnimatePresence>

      <Link 
        to="/watchlist"
        className="block text-sm text-center text-blue-600 hover:text-blue-800 pt-2"
      >
        View all alerts →
      </Link>
    </div>
  );
};

export default DashboardWatchlist;