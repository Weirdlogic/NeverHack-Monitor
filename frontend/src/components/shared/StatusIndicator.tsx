import React from 'react';

type StatusType = 'online' | 'offline' | 'warning' | 'error';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  status, 
  label,
  size = 'md' 
}) => {
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-gray-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
    }
  };

  const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm': return 'h-2 w-2';
      case 'md': return 'h-3 w-3';
      case 'lg': return 'h-4 w-4';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`rounded-full ${getStatusColor(status)} ${getSizeClasses(size)} animate-pulse`} />
      {label && <span className="text-sm text-gray-600">{label}</span>}
    </div>
  );
};

export default StatusIndicator;