import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <IconButton 
        icon={icon} 
        size={64} 
        iconColor="#94a3b8" 
        style={styles.icon}
      />
      <Text variant="titleMedium" style={styles.titleText}>{title}</Text>
      <Text variant="bodyMedium" style={styles.subtitleText}>{subtitle}</Text>
      
      {actionLabel && onAction && (
        <Button 
          mode="contained" 
          onPress={onAction} 
          style={styles.actionBtn}
          labelStyle={styles.btnLabel}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  icon: {
    backgroundColor: '#f1f5f9',
    margin: 0,
    marginBottom: 16,
  },
  titleText: {
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'center',
  },
  subtitleText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  btnLabel: {
    fontWeight: 'bold',
  },
});
