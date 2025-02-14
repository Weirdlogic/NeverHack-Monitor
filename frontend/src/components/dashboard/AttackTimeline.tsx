import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecentTargets, getAttackMethods, getTargetDetails } from '../../services/api';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Shield, AlertTriangle, Server, Activity } from 'lucide-react';
import type { Target } from '../../types/api.types';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#65a30d'];

interface DetailedTarget extends Target {
  summary?: {
    unique_ports: number[];
    unique_methods: string[];
    unique_paths: string[];
  };
  use_ssl?: boolean;
  body?: {
    value: string;
  };
}

interface AttackOverviewProps {
  initialTarget?: Target;
  initialDetails?: DetailedTarget[];
}

const AttackOverview: React.FC<AttackOverviewProps> = ({ initialTarget, initialDetails }) => {
  const [selectedHost, setSelectedHost] = React.useState<string | null>(initialTarget?.host || null);

  const { data: methods } = useQuery<Record<string, number>>({
    queryKey: ['attackMethods'],
    queryFn: getAttackMethods,
    refetchInterval: 30000
  });

  const { data: recentTargets } = useQuery<Target[]>({
    queryKey: ['recentTargets'],
    queryFn: getRecentTargets,
    refetchInterval: 15000,
    initialData: initialTarget ? [initialTarget] : undefined
  });

  const { data: selectedTargetDetails } = useQuery<DetailedTarget[]>({
    queryKey: ['target-details', selectedHost],
    queryFn: async () => selectedHost ? await getTargetDetails(selectedHost) as DetailedTarget[] : [],
    enabled: !!selectedHost,
    staleTime: 10000,
    initialData: initialDetails
  });

  // Group targets by host
  const groupedTargets = React.useMemo(() => {
    if (!recentTargets) return new Map<string, Target>();
    
    const targets = initialTarget ? [initialTarget, ...recentTargets.filter(t => t.host !== initialTarget.host)] : recentTargets;
    
    return targets.reduce((acc: Map<string, Target>, target: Target) => {
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
  }, [recentTargets, initialTarget]);

  // Safely access target details
  const targetDetails = selectedTargetDetails || [];
  const firstTarget = targetDetails[0];

  const methodsData = React.useMemo(() => {
    if (!methods) return [];
    return Object.entries(methods)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        value: count
      }));
  }, [methods]);

  const getAttackSeverity = (attacks: number) => {
    if (attacks > 100) return 'High';
    if (attacks > 50) return 'Medium';
    return 'Low';
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Result Details */}
      {initialTarget && targetDetails.length > 0 && (
        <motion.div
          key="search-details"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Search Result Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Server className="h-5 w-5" />
                <span className="font-medium">Infrastructure</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Host: {firstTarget?.host || 'N/A'}</div>
                <div>Ports: {firstTarget?.summary?.unique_ports?.join(', ') || 'N/A'}</div>
                <div>SSL/TLS: {targetDetails.some((t: DetailedTarget) => t.use_ssl) ? 'Yes' : 'No'}</div>
                <div>IP: {firstTarget?.ip || 'N/A'}</div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Activity className="h-5 w-5" />
                <span className="font-medium">Attack Vectors</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Methods: {firstTarget?.summary?.unique_methods?.join(', ') || 'N/A'}</div>
                <div>Type: {firstTarget?.type || 'N/A'}</div>
                <div>Unique Paths: {firstTarget?.summary?.unique_paths?.length || 0}</div>
              </div>
            </div>
          </div>

          {/* Attack Timeline */}
          <div className="mt-6">
            <h4 className="text-base font-medium text-gray-900 mb-4">Recent Activity</h4>
            <div className="space-y-3">
              {targetDetails.map((detail: DetailedTarget, index: number) => (
                <div 
                  key={`${detail.host}-${detail.method}-${index}`}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Method</div>
                      <div className="font-mono text-sm">{detail.method}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Port</div>
                      <div className="font-mono text-sm">{detail.port}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm font-medium text-gray-500">Time</div>
                      <div className="font-mono text-sm">{formatDate(detail.first_seen)}</div>
                    </div>
                    {detail.path && (
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-500">Path</div>
                        <div className="font-mono text-sm truncate">{detail.path}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Attack Methods Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm"
        >
          <h3 className="text-lg font-medium mb-4">Top Attack Methods</h3>
          <div className="h-[450px]">
            {methodsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                  <Pie
                    data={methodsData}
                    cx="50%"
                    cy="45%"
                    innerRadius={90}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {methodsData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [`${value} attacks`, name]}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '6px',
                      padding: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No attack methods data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Active Targets */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm"
        >
          <h3 className="text-lg font-medium mb-4">Active Targets</h3>
          <div className="space-y-3 max-h-[450px] overflow-y-auto">
            {Array.from(groupedTargets.entries()).map(([host, target]) => (
              <motion.button
                key={host}
                onClick={() => setSelectedHost(host)}
                className={`w-full p-4 rounded-lg border transition-all ${
                  selectedHost === host 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {(target.attacks ?? 0) > 50 ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Shield className="w-5 h-5 text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-left truncate" title={host}>{host}</p>
                      <p className="text-sm text-gray-500 text-left">{target.ip}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {target.attacks ?? 0} attacks
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                        (target.attacks ?? 0) > 100 ? 'bg-red-100 text-red-700' :
                        (target.attacks ?? 0) > 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {getAttackSeverity(target.attacks ?? 0)}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">Port {target.port}</p>
                  </div>
                </div>
              </motion.button>
            ))}
            {groupedTargets.size === 0 && (
              <div className="text-center text-gray-500 py-8">
                No active targets found
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AttackOverview;