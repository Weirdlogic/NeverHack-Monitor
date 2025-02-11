import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target } from '../../types/api.types';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Globe, Activity, Calendar, Hash } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTargetDetails } from '../../services/api';

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

interface SearchResultsProps {
  results: Target[];
  isVisible: boolean;
  onClose: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, isVisible, onClose }) => {
  const navigate = useNavigate();
  const [selectedHost, setSelectedHost] = React.useState<string | null>(null);
  
  const { data: selectedTargetDetails } = useQuery<DetailedTarget[]>({
    queryKey: ['target-details', selectedHost],
    queryFn: async () => selectedHost ? await getTargetDetails(selectedHost) as DetailedTarget[] : [],
    enabled: !!selectedHost,
    staleTime: 10000,
  });

  const handleResultClick = (target: Target) => {
    setSelectedHost(target.host);
    navigate('/', { 
      state: { 
        selectedTarget: target,
        targetDetails: selectedTargetDetails,
        fromSearch: true
      } 
    });
    onClose();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'http':
        return <Globe className="h-4 w-4 text-blue-500" />;
      case 'tcp':
        return <Server className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Group results by host
  const groupedResults = React.useMemo(() => {
    const grouped = new Map<string, Target[]>();
    results.forEach(result => {
      if (!grouped.has(result.host)) {
        grouped.set(result.host, []);
      }
      grouped.get(result.host)!.push(result);
    });
    return grouped;
  }, [results]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <div className="fixed inset-0 bg-transparent" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-96 overflow-auto"
          >
            {Array.from(groupedResults.entries()).length > 0 ? (
              <div className="py-2 divide-y divide-gray-100">
                {Array.from(groupedResults.entries()).map(([host, targets]) => (
                  <div key={host} className="px-2 py-3">
                    <div className="px-2 mb-2">
                      <div className="text-sm font-medium text-gray-700">{host}</div>
                      <div className="text-xs text-gray-500">
                        {targets[0].ip} • {targets.length} recorded activities
                      </div>
                    </div>
                    <div className="space-y-1">
                      {targets.map((target, index) => (
                        <motion.button
                          key={`${target.host}-${target.first_seen || Date.now()}-${target.ip}-${target.port}-${index}`}
                          onClick={() => handleResultClick(target)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 rounded-md flex items-center gap-3"
                          whileHover={{ scale: 1.01 }}
                        >
                          {getIcon(target.type)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">
                                {formatDate(target.first_seen)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <Hash className="h-3 w-3" />
                              <span>{target.attacks || 0} attacks</span>
                              <span>•</span>
                              <span>{target.attack_stats?.methods_used?.length || 0} methods</span>
                              <span>•</span>
                              <span>{target.attack_stats?.ports_targeted?.length || 0} ports</span>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                No results found
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SearchResults;