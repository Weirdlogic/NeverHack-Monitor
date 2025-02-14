import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Globe, Server, Network } from 'lucide-react';
import type { DashboardStats } from '../../types/api.types';
import toast from 'react-hot-toast';

const StatusCard = ({ label, value, Icon, delay }: { 
  label: string; 
  value?: number | null; 
  Icon: React.FC<any>;
  delay: number;
}) => (
  <motion.div
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay, duration: 0.3 }}
    className="p-4 lg:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-gray-600">{label}</p>
        <motion.p 
          key={value}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1 lg:mt-2"
        >
          {typeof value === 'number' ? value.toLocaleString() : '0'}
        </motion.p>
      </div>
      <div className="p-2 lg:p-3 bg-blue-50 rounded-lg">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
      </div>
    </div>
  </motion.div>
);

const StatusGrid = () => {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      try {
        return await getDashboardStats();
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
        throw error;
      }
    },
    refetchInterval: 5000,
    retry: 3,
    staleTime: 1000
  });

  const cards = [
    { label: 'Total Targets', value: stats?.total_targets, Icon: Globe, delay: 0 },
    { label: 'Attack Waves', value: stats?.total_attacks, Icon: Shield, delay: 0.1 },  // Updated label to be more accurate
    { label: 'Unique Hosts', value: stats?.unique_hosts, Icon: Server, delay: 0.2 },
    { label: 'Unique IPs', value: stats?.unique_ips, Icon: Network, delay: 0.3 },
  ];

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg text-red-600">
        Failed to load statistics. Please try again later.
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center h-32"
        >
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          {cards.map((card) => (
            <StatusCard key={card.label} {...card} />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default StatusGrid;