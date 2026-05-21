import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, IconButton } from 'react-native-paper';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color?: string;
  onPress?: () => void;
}

export default function StatsCard({ title, value, icon, color = '#2196F3', onPress }: StatsCardProps) {
  return (
    <Card 
      style={[styles.card, { borderLeftColor: color }]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.leftInfo}>
          <Text variant="bodySmall" style={styles.titleText}>{title}</Text>
          <Text variant="headlineSmall" style={styles.valText}>{value}</Text>
        </View>
        <IconButton 
          icon={icon} 
          size={24} 
          iconColor={color} 
          style={[styles.iconContainer, { backgroundColor: `${color}15` }]} 
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderLeftWidth: 4,
    marginHorizontal: 4,
    marginVertical: 6,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  leftInfo: {
    flex: 1,
  },
  titleText: {
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  valText: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
  },
  iconContainer: {
    margin: 0,
    borderRadius: 6,
  },
});
