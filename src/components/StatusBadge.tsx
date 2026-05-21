import React from 'react';
import { StyleSheet } from 'react-native';
import { Badge } from 'react-native-paper';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const getBadgeColor = (val: string) => {
    const s = val.toLowerCase();
    
    // Green
    if (s === 'active' || s === 'in stock' || s === 'completed' || s === 'receipt confirmed') {
      return '#10b981';
    }
    // Yellow / Amber
    if (s === 'pending' || s === 'low stock' || s === 'planning' || s === 'in progress') {
      return '#f59e0b';
    }
    // Red
    if (s === 'inactive' || s === 'out of stock' || s === 'cancelled' || s === 'rejected' || s === 'receipt rejected') {
      return '#ef4444';
    }
    // Orange
    if (s === 'on hold') {
      return '#f97316';
    }
    // Blue
    if (s === 'approved') {
      return '#2196F3';
    }

    return '#64748b'; // Slate gray fallback
  };

  const badgeColor = getBadgeColor(status);
  const isSmall = size === 'small';

  return (
    <Badge 
      style={[
        styles.badge, 
        { 
          backgroundColor: badgeColor,
          paddingHorizontal: isSmall ? 6 : 10,
          fontSize: isSmall ? 10 : 12,
          height: isSmall ? 18 : 22,
          lineHeight: isSmall ? 16 : 20,
        }
      ]}
    >
      {status}
    </Badge>
  );
}

const styles = StyleSheet.create({
  badge: {
    color: '#ffffff',
    fontWeight: 'bold',
    borderRadius: 6,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
});
