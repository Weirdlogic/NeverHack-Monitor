import { useEffect, useState } from 'react';
import { getApiHealth, getSearchHealth } from '../../services/api';
import type { HealthStatus } from '../../types/api.types';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const SecurityPage = () => {
  const [apiHealth, setApiHealth] = useState<HealthStatus | null>(null);
  const [searchHealth, setSearchHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const [api, search] = await Promise.all([
          getApiHealth(),
          getSearchHealth()
        ]);
        setApiHealth(api);
        setSearchHealth(search);
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ok':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Health</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">API Status</h2>
            {apiHealth && (
              <div className={`px-2 py-1 rounded text-sm ${getStatusColor(apiHealth.status)}`}>
                {apiHealth.status}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {apiHealth && getStatusIcon(apiHealth.status)}
              <span className="text-sm text-gray-600">
                Last checked: {apiHealth?.timestamp ? new Date(apiHealth.timestamp).toLocaleString() : 'Never'}
              </span>
            </div>
            {apiHealth?.error && (
              <div className="text-sm text-red-600">
                Error: {apiHealth.error}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Search Status</h2>
            {searchHealth && (
              <div className={`px-2 py-1 rounded text-sm ${getStatusColor(searchHealth.status)}`}>
                {searchHealth.status}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {searchHealth && getStatusIcon(searchHealth.status)}
              <span className="text-sm text-gray-600">
                Last checked: {searchHealth?.timestamp ? new Date(searchHealth.timestamp).toLocaleString() : 'Never'}
              </span>
            </div>
            {searchHealth?.error && (
              <div className="text-sm text-red-600">
                Error: {searchHealth.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;