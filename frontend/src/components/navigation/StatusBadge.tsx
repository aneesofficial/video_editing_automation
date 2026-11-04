import React from 'react';
import { Badge } from '../ui/Badge';

export interface StatusBadgeProps {
  status: 'connected' | 'checking' | 'disconnected' | 'error';
  showLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showLabel = true }) => {
  switch (status) {
    case 'connected':
      return (
        <Badge variant="emerald" size="sm" dot>
          {showLabel ? 'AI Engine Online' : 'Online'}
        </Badge>
      );
    case 'checking':
      return (
        <Badge variant="amber" size="sm" dot>
          {showLabel ? 'Checking Engine...' : 'Checking'}
        </Badge>
      );
    case 'disconnected':
    case 'error':
    default:
      return (
        <Badge variant="neutral" size="sm" dot>
          {showLabel ? 'Engine Offline (Local)' : 'Offline'}
        </Badge>
      );
  }
};
