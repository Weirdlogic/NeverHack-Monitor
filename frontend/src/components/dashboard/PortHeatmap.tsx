import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRecentTargets } from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

interface Target {
  port: number;
}

const PortHeatmap = () => {
  const { data: targets = [], isLoading } = useQuery<Target[]>({
    queryKey: ['recentTargets'],
    queryFn: getRecentTargets,
    refetchInterval: 30000,
  });

  const { portFrequency, maxFrequency } = useMemo(() => {
    const freq = targets.reduce((acc: Record<number, number>, target: Target) => {
      acc[target.port] = (acc[target.port] || 0) + 1;
      return acc;
    }, {});

    const entries = Object.entries(freq).map(([port, count]) => [Number(port), count]);
    
    return {
      portFrequency: entries
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10) as [number, number][], // Reduced to top 10 most targeted ports
      maxFrequency: Math.max(...Object.values(freq)),
    };
  }, [targets]);

  const getColorIntensity = (frequency: number) => {
    const intensity = frequency / maxFrequency;
    return {
      backgroundColor: `rgba(37, 99, 235, ${0.2 + intensity * 0.8})`,
      color: intensity > 0.4 ? 'white' : 'black',
    };
  };

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-center h-full"
        >
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent" />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-5 gap-2"
        >
          {portFrequency.map(([port, frequency], index) => (
            <Popover key={port} className="relative">
              <PopoverButton as={motion.div}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-2 rounded-lg shadow-sm cursor-help w-full text-center"
                style={getColorIntensity(frequency)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-xs font-medium">Port {port}</div>
                <div className="text-xs opacity-80">{frequency}</div>
              </PopoverButton>
              <PopoverPanel className="absolute z-10 bg-white p-2 rounded shadow-lg text-xs mt-1 w-full min-w-[100px]">
                <div className="font-medium">Port {port}</div>
                <div className="text-gray-600">{frequency} hits</div>
              </PopoverPanel>
            </Popover>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PortHeatmap;