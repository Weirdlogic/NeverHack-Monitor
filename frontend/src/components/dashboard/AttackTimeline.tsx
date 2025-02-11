import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecentTargets, getAttackMethods, getTargetDetails } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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

const AttackOverview = () => {
  const [selectedHost, setSelectedHost] = React.useState<string | null>(null);

  const { data: methods } = useQuery<Record<string, number>>({
    queryKey: ['attackMethods'],
    queryFn: getAttackMethods,
    refetchInterval: 30000
  });

  const { data: recentTargets } = useQuery<Target[]>({
    queryKey: ['recentTargets'],
    queryFn: getRecentTargets,
    refetchInterval: 15000
  });

  const { data: selectedTargetDetails } = useQuery<DetailedTarget[]>({
    queryKey: ['target-details', selectedHost],
    queryFn: async () => selectedHost ? await getTargetDetails(selectedHost) as DetailedTarget[] : [],
    enabled: !!selectedHost,
    staleTime: 10000,
  });

  // Group targets by host
  const groupedTargets = React.useMemo(() => {
    if (!recentTargets) return new Map<string, Target>();
    
    return recentTargets.reduce((acc: Map<string, Target>, target: Target) => {
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
  }, [recentTargets]);

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attack Methods Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm"
        >
          <h3 className="text-lg font-medium mb-4">Top Attack Methods</h3>
          <div className="h-64">
            {methodsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {methodsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
          <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
            {Array.from(groupedTargets.entries()).map(([host, target]) => (
              <motion.button
                key={host}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                      <p className="font-medium truncate" title={host}>{host}</p>
                      <p className="text-sm text-gray-500">{target.ip}</p>
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

      {/* Target Details Panel */}
      <AnimatePresence mode="wait">
        {selectedHost && selectedTargetDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Target Details</h3>
              <button 
                onClick={() => setSelectedHost(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Server className="h-5 w-5" />
                  <span className="font-medium">Infrastructure</span>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Host: {selectedHost}</div>
                  <div>Ports: {selectedTargetDetails[0]?.summary?.unique_ports?.join(', ')}</div>
                  <div>SSL/TLS: {selectedTargetDetails.some(t => t.use_ssl) ? 'Yes' : 'No'}</div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 text-purple-600 mb-2">
                  <Activity className="h-5 w-5" />
                  <span className="font-medium">Attack Vectors</span>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Methods: {selectedTargetDetails[0]?.summary?.unique_methods?.join(', ')}</div>
                  <div>Unique Paths: {selectedTargetDetails[0]?.summary?.unique_paths?.length || 0}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AttackOverview;