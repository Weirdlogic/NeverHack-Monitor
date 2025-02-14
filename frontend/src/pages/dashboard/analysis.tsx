import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveTargets, getTargetDetails } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Activity, AlertCircle, Loader2 } from 'lucide-react';
import type { Target } from '../../types/api.types';
import { useLocation } from 'react-router-dom';

interface DetailedTarget extends Target {
  summary: {
    unique_ports: number[];
    unique_methods: string[];
    unique_paths: string[];
  };
  use_ssl?: boolean;
  body?: {
    value: string;
  };
}

interface LocationState {
  selectedTarget?: Target;
  targetDetails?: DetailedTarget[];
  fromSearch?: boolean;
}

const getUniqueValues = (array: DetailedTarget[], key: keyof DetailedTarget): string[] => {
  const values = array.map(item => String(item[key])); // Convert all values to strings
  return Array.from(new Set(values));
};

interface AnalysisProps {
  initialTarget?: Target;
  initialDetails?: DetailedTarget[];
}

const Analysis: React.FC<AnalysisProps> = () => {
  const location = useLocation();
  const state = location.state as LocationState;
  const [selectedHost, setSelectedHost] = React.useState<string | null>(state?.selectedTarget?.host || null);
  const [timeRange, setTimeRange] = React.useState(7); // Days

  const { data: targets, isLoading, error, refetch } = useQuery({
    queryKey: ['active-targets', timeRange],
    queryFn: () => getActiveTargets(timeRange),
    refetchInterval: 5000, // Poll every 5 seconds
    retry: 3,
    staleTime: 1000, // Consider data fresh for 1 second
    initialData: state?.selectedTarget ? [state.selectedTarget] : undefined,
  });

  const { data: selectedTargetDetails, isLoading: isLoadingDetails } = useQuery<DetailedTarget[]>({
    queryKey: ['target-details', selectedHost],
    queryFn: async () => selectedHost ? await getTargetDetails(selectedHost) as DetailedTarget[] : [],
    enabled: !!selectedHost,
    staleTime: 10000,
    initialData: state?.targetDetails as DetailedTarget[],
  });

  // Group targets by host and ensure we have all fields
  const groupedTargets = React.useMemo(() => {
    if (!targets) return new Map<string, Target>();
    
    return targets.reduce((acc: Map<string, Target>, target: Target) => {
      // Ensure we have all required fields with defaults if necessary
      const processedTarget = {
        ...target,
        attacks: target.attacks || 0,
        attack_stats: target.attack_stats || {
          methods_used: [],
          ports_targeted: []
        },
        first_seen: target.first_seen || new Date().toISOString(),
        last_seen: target.last_seen || target.first_seen || new Date().toISOString()
      };
      acc.set(target.host, processedTarget);
      return acc;
    }, new Map<string, Target>());
  }, [targets]);

  const getStatusColor = (attacks?: number): string => {
    if (!attacks) return 'bg-gray-500';
    if (attacks > 100) return 'bg-red-500';
    if (attacks > 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleString();
  };

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Failed to load targets</h3>
          <p className="text-gray-500 mb-4">Please try refreshing the page</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
      {/* Main Target List */}
      <div className="lg:col-span-1 bg-white rounded-lg shadow p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 lg:mb-6 gap-3">
          <div>
            <h2 className="text-lg lg:text-xl font-semibold">Active Targets</h2>
            <p className="text-sm text-gray-500 mt-1">
              {groupedTargets.size} targets found
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="rounded border-gray-300 text-sm min-w-[120px]"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button 
              onClick={handleRefresh} 
              className="p-2 text-gray-500 hover:text-blue-500"
              title="Refresh"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Activity className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {isLoading && groupedTargets.size === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
            {Array.from(groupedTargets.entries()).map(([host, target]) => (
              <motion.button
                key={host}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedHost(host)}
                className={`w-full p-3 lg:p-4 rounded-lg border transition-all ${
                  selectedHost === host 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate max-w-[180px] sm:max-w-none" title={host}>{host}</span>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getStatusColor(target.attacks)}`} />
                    <span className="text-sm text-gray-500 whitespace-nowrap">{target.attacks} attacks</span>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500 text-left">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0">
                    <span className="truncate">IP: {target.ip}</span>
                    <span>{target.type}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between text-xs mt-1 gap-1 sm:gap-0">
                    <span>Port: {target.port}</span>
                    <span>Method: {target.method}</span>
                  </div>
                  <div className="mt-1 text-xs">
                    First seen: {formatDate(target.first_seen)}
                  </div>
                </div>
              </motion.button>
            ))}

            {groupedTargets.size === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                No active targets in the selected time range
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Panel */}
      <div className="lg:col-span-2">
        <AnimatePresence mode="wait">
          {selectedHost && selectedTargetDetails ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Server className="h-5 w-5" />
                    <span className="font-medium">Infrastructure Summary</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Unique IPs: {getUniqueValues(selectedTargetDetails, 'ip').length}</div>
                    <div>Ports: {selectedTargetDetails[0].summary.unique_ports.join(', ')}</div>
                    <div>SSL/TLS: {selectedTargetDetails.some(t => t.use_ssl) ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-600 mb-2">
                    <Activity className="h-5 w-5" />
                    <span className="font-medium">Attack Vectors</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Methods: {selectedTargetDetails[0].summary.unique_methods.join(', ')}</div>
                    <div>Types: {getUniqueValues(selectedTargetDetails, 'type').join(', ')}</div>
                    <div>Unique Paths: {selectedTargetDetails[0].summary.unique_paths.length}</div>
                  </div>
                </div>
              </div>

              {/* Attack Instances */}
              <div className="bg-white rounded-lg shadow p-4 lg:p-6">
                <h3 className="text-lg font-medium mb-4">Attack Instances</h3>
                <div className="space-y-4 overflow-x-auto">
                  {selectedTargetDetails?.map((target: DetailedTarget, index: number) => (
                    <motion.div 
                      key={`${target.host}-${target.method}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-500">Method</div>
                          <div className="font-mono">{target.method}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Type</div>
                          <div className="font-mono">{target.type}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">IP Address</div>
                          <div className="font-mono">{target.ip}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Port</div>
                          <div className="font-mono">{target.port}</div>
                        </div>
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
                        <div className="mt-3">
                          <div className="text-sm font-medium text-gray-500">Path</div>
                          <div className="font-mono text-sm break-all bg-gray-50 p-2 rounded mt-1">
                            {target.path}
                          </div>
                        </div>
                      )}
                      {target.body?.value && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-gray-500">Request Body</div>
                          <div className="font-mono text-sm break-all bg-gray-50 p-2 rounded mt-1">
                            {target.body.value}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center h-64"
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
  );
};

export default Analysis;