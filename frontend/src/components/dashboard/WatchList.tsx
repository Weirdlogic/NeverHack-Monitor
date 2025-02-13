import { useEffect, useState } from 'react';
import { Target } from '../../types/api.types';
import { useSearch } from '../../hooks/useSearch';
import SearchBar from '../shared/SearchBar';
import { Globe, Check, X, ArrowLeft, Server, Activity, AlertTriangle } from 'lucide-react';
import { getWatchlistItems, addWatchlistItem, deleteWatchlistItem, checkWatchlistItem, getActiveTargets } from '../../services/api';
import AddWatchlistItem from './AddWatchlistItem';
import AttackOverview from './AttackTimeline';  // Fixed import name
import toast from 'react-hot-toast';

interface WatchlistItem {
  id: number;
  pattern: string;
  description: string;
  severity: string;
  created_at: string;
  last_match?: string;
  match_count?: number; // Make match_count optional since it might not be present in API response
  is_up?: boolean;
  last_check?: string;
  last_status?: number;
}

interface ExtendedTarget extends Target {
  body?: string;
}

interface WatchlistMatch {
  pattern: string;
  target: ExtendedTarget;
  severity: string;
  description: string;
  match_count: number;
  timestamp: string;
}

const WatchList = () => {
  const { searchResults, searchQuery } = useSearch();
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<WatchlistMatch[]>([]);  // Restore alerts state
  const [selectedTarget, setSelectedTarget] = useState<ExtendedTarget | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Regular polling instead of WebSocket
  useEffect(() => {
    const pollInterval = setInterval(() => {
      refreshWatchlist();
    }, 300000); // Poll every 30 seconds

    // Initial load
    refreshWatchlist();

    return () => clearInterval(pollInterval);
  }, []);

  const refreshWatchlist = async () => {
    try {
      const items = await getWatchlistItems();
      // Ensure all items have valid IDs
      const validItems = items.filter(item => typeof item.id === 'number' && !isNaN(item.id));
      setWatchlistItems(validItems);
    } catch (err) {
      console.error('Error fetching watchlist:', err);
      toast.error('Failed to load watchlist');
    }
  };

  useEffect(() => {
    refreshWatchlist();
  }, []);

  // Add alerts handling
  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const targets = await getActiveTargets(1); // Get last 24 hours
        const matchedAlerts = watchlistItems
          .filter(item => targets.some(target => 
            target.host.includes(item.pattern) || target.ip.includes(item.pattern)
          ))
          .map(item => {
            const matchedTarget = targets.find(target => 
              target.host.includes(item.pattern) || target.ip.includes(item.pattern)
            );
            return {
              pattern: item.pattern,
              severity: item.severity,
              description: item.description,
              match_count: item.match_count ?? 0,
              timestamp: item.last_match || '',
              target: matchedTarget || {
                host: item.pattern,
              } as ExtendedTarget 
            };
          });
        setAlerts(matchedAlerts);
      } catch (error) {
        console.error('Failed to fetch match data:', error);
      }
    };

    fetchMatchData();
    const matchInterval = setInterval(fetchMatchData, 300000); // Poll every 30 seconds
    return () => clearInterval(matchInterval);
  }, [watchlistItems]);

  const handleAddToWatchlist = async (pattern: string) => {
    try {
      await addWatchlistItem({
        pattern,
        description: 'Added from search',
        severity: 'medium'
      });
      await refreshWatchlist(); // Refresh list after adding
      toast.success(`Added "${pattern}" to watchlist`);
    } catch (error) {
      console.error('Error adding to watchlist:', error);
      toast.error('Failed to add to watchlist');
    }
  };

  const handleDeleteItem = async (id: number | undefined) => {
    if (!id || isNaN(id) || !Number.isInteger(id)) {
      toast.error('Cannot delete: Invalid item ID');
      return;
    }
    
    const itemToDelete = watchlistItems.find(item => item.id === id);
    if (!itemToDelete) {
      toast.error('Item not found');
      return;
    }
    
    try {
      await deleteWatchlistItem(id);
      setWatchlistItems(prev => prev.filter(item => item.id !== id));
      toast.success(`Removed "${itemToDelete.pattern}" from watchlist`);
    } catch (error: any) {
      console.error('Error removing from watchlist:', error);
      const message = error.response?.data?.detail || error.userMessage || 'Failed to remove from watchlist';
      toast.error(message);
    }
  };

  const getSeverityColor = (severity: string | undefined) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  const handleCheckStatus = async (id: number) => {
    try {
      const status = await checkWatchlistItem(id);
      // Update the item status in the list
      setWatchlistItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...status } : item
      ));
    } catch (err) {
      console.error('Error checking status:', err);
      toast.error('Failed to check status');
    }
  };

  const renderStatus = (item: WatchlistItem) => {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {item.is_up ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <X className="h-4 w-4 text-red-500" />
          )}
          <span className="text-gray-500">
            {item.last_check 
              ? `Last checked: ${new Date(item.last_check).toLocaleTimeString()}`
              : 'Not checked yet'}
          </span>
        </div>
        <button
          onClick={() => handleCheckStatus(item.id)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          Check now
        </button>
      </div>
    );
  };

  const handleAlertClick = (alert: WatchlistMatch) => {
    setSelectedTarget(alert.target);
    setShowDetails(true);
  };

  const renderIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'http':
        return <Globe className="h-5 w-5 text-blue-500" />;
      case 'tcp':
        return <Server className="h-5 w-5 text-green-500" />;
      default:
        return <Activity className="h-5 w-5 text-yellow-500" />;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  if (showDetails && selectedTarget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowDetails(false);
              setSelectedTarget(null);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-medium">Target Details</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Infrastructure Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-4">Infrastructure Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Host</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTarget.host}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">IP Address</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTarget.ip}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTarget.type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Port</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTarget.port}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Method</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTarget.method}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">First Seen</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(selectedTarget.first_seen)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Attack Details */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-4">Attack Details</h3>
            <dl className="space-y-4">
              {selectedTarget.path && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Attack Path</dt>
                  <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedTarget.path}
                  </dd>
                </div>
              )}
              {selectedTarget.body && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Request Body</dt>
                  <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    <pre className="whitespace-pre-wrap">{selectedTarget.body}</pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-medium mb-4">Timeline</h3>
          <AttackOverview />  {/* Remove targetHost prop as it's not supported */}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <SearchBar className="w-96" />
        
        <div className="text-sm text-gray-500">
          {watchlistItems.length} items in watchlist
        </div>
      </div>

      <AddWatchlistItem onAdd={refreshWatchlist} />

      {/* Alerts Section */}
      {alerts?.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="font-medium text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Matches
          </h3>
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div 
                key={`${alert?.pattern}-${idx}`}
                className="bg-red-50 border border-red-100 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => handleAlertClick(alert)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">{alert?.pattern || 'Unknown'}</span>
                    <p className="text-sm text-gray-600 mt-1">
                      Matched target: {alert?.target?.host || 'Unknown'}
                    </p>
                  </div>
                  <span className={`text-sm ${getSeverityColor(alert?.severity)}`}>
                    {alert?.severity || 'Unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      <div className="space-y-2">
        {watchlistItems.map(item => (
          <div 
            key={item.id}
            className="border rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <span className="font-medium">{item.pattern}</span>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </div>
              <span className={`text-sm ${getSeverityColor(item.severity)}`}>
                {item.severity}
              </span>
            </div>
            
            {renderStatus(item)}
            
            <div className="mt-2 text-sm text-gray-500">
              {(item.match_count ?? 0) > 0 ? (
                <div>
                  {item.match_count} matches
                  {item.last_match && ` (Last: ${new Date(item.last_match).toLocaleString()})`}
                </div>
              ) : (
                <div>No matches yet</div>
              )}
            </div>

            <button
              onClick={() => handleDeleteItem(item.id)}
              className="text-sm text-red-600 hover:text-red-800 mt-2"
            >
              Remove from watchlist
            </button>
          </div>
        ))}

        {watchlistItems.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No items in watchlist
          </div>
        )}
      </div>

      {/* Search Results - only show when there are results */}
      {searchQuery && searchResults && searchResults.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-2">Search Results</h3>
          <div className="space-y-2">
            {searchResults.map((result: Target) => (
              <div 
                key={result.host}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {renderIcon(result.type)}
                  <span>{result.host}</span>
                </div>
                <button
                  onClick={() => handleAddToWatchlist(result.host)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Add to watchlist
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchList;