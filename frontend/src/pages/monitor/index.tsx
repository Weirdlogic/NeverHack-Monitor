import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Globe, Check, X, Activity, Loader2 } from 'lucide-react';
import type { Target } from '../../types/api.types';
import { getActiveTargets, getWatchlistItems, checkWatchlistItem, getTargetDetails } from '../../services/api';

interface DetailedTarget extends Target {
  body?: {
    value: string;
  };
}

interface WatchlistItem {
  id: number;
  pattern: string;
  description: string;
  severity: string;
  is_up?: boolean;
  last_check?: string;
  last_status?: number;
}

const MonitorPage = () => {
  const [selectedHost, setSelectedHost] = React.useState<string | null>(null);
  const [watchlistItems, setWatchlistItems] = React.useState<WatchlistItem[]>([]);
  const [groupedTargets, setGroupedTargets] = React.useState<Map<string, Target>>(new Map());
  const [selectedTargetDetails, setSelectedTargetDetails] = React.useState<DetailedTarget[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);

  // Poll for targets that match watchlist patterns
  React.useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const targets = await getActiveTargets({ days: 1 }); // Get last 24 hours
        const filtered = targets.filter(target => 
          watchlistItems.some(item => 
            target.host.includes(item.pattern) || target.ip.includes(item.pattern)
          )
        );

        // Group targets by host
        const grouped = filtered.reduce((acc: Map<string, Target>, target: Target) => {
          const processedTarget = {
            ...target,
            attacks: target.attacks || 0,
          };
          acc.set(target.host, processedTarget);
          return acc;
        }, new Map());

        setGroupedTargets(grouped);
      } catch (error) {
        console.error('Failed to fetch targets:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [watchlistItems]);

  // Load target details when host is selected
  React.useEffect(() => {
    const loadDetails = async () => {
      if (!selectedHost) return;
      
      setIsLoadingDetails(true);
      try {
        const details = await getTargetDetails(selectedHost) as DetailedTarget[];
        setSelectedTargetDetails(details);
      } catch (error) {
        console.error('Failed to load target details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadDetails();
  }, [selectedHost]);

  // Poll watchlist items status
  React.useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const items = await getWatchlistItems();
        setWatchlistItems(items);

        for (const item of items) {
          try {
            const status = await checkWatchlistItem(item.id);
            setWatchlistItems(prev => 
              prev.map(i => i.id === item.id ? { ...i, ...status } : i)
            );
          } catch (error) {
            console.error(`Failed to check status for ${item.pattern}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch watchlist:', error);
      }
    };

    fetchWatchlist();
    const watchlistInterval = setInterval(fetchWatchlist, 30000);
    return () => clearInterval(watchlistInterval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Watchlist Status Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Watchlist Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchlistItems.map((item) => (
            <div key={item.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">{item.pattern}</span>
                </div>
                <span className={`px-2 py-1 rounded text-sm ${getSeverityColor(item.severity)}`}>
                  {item.severity}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-2">
                {item.is_up ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-red-500" />
                )}
                <span className="text-gray-600">
                  Status: {item.is_up ? 'Up' : 'Down'}
                  {item.last_status ? ` (${item.last_status})` : ''}
                </span>
              </div>
              {item.last_check && (
                <div className="text-xs text-gray-500 mt-1">
                  Last checked: {new Date(item.last_check).toLocaleString()}
                </div>
              )}
            </div>
          ))}
          {watchlistItems.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No items in watchlist to monitor
            </div>
          )}
        </div>
      </div>

      {/* Live Matches Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Live Matches</h2>
            <div className="flex items-center gap-2">
              <div className="animate-pulse h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Target List */}
          <div className="space-y-4">
            <AnimatePresence>
              {Array.from(groupedTargets.values()).map((target) => (
                <motion.div
                  key={target.host}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedHost === target.host ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedHost(target.host)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded">
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{target.host}</span>
                          <span className="text-sm text-gray-500">({target.ip})</span>
                        </div>
                        <span className="text-sm text-gray-500">{target.attacks} hits</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {target.method} • Port {target.port} • {target.type}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {groupedTargets.size === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-3" />
                <p>No matching targets detected</p>
              </div>
            )}
          </div>

          {/* Target Details */}
          <AnimatePresence mode="wait">
            {selectedHost && selectedTargetDetails.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="border rounded-lg"
              >
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="font-medium">Target Details</h3>
                </div>
                <div className="p-4 space-y-6">
                  {selectedTargetDetails.map((target, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-500">First Seen</div>
                          <div className="font-mono">{formatDate(target.first_seen)}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Last Seen</div>
                          <div className="font-mono">{formatDate(target.last_seen)}</div>
                        </div>
                      </div>
                      {target.path && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Path</div>
                          <div className="font-mono text-sm break-all bg-gray-50 p-2 rounded mt-1">
                            {target.path}
                          </div>
                        </div>
                      )}
                      {target.body?.value && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Request Body</div>
                          <div className="font-mono text-sm break-all bg-gray-50 p-2 rounded mt-1">
                            {target.body.value}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-lg border p-6 flex flex-col items-center justify-center h-64"
              >
                {isLoadingDetails ? (
                  <>
                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                    <p className="text-gray-500">Loading target details...</p>
                  </>
                ) : (
                  <>
                    <Server className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Select a target to view details</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MonitorPage;