import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Surface, Avatar } from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { ProjectStackParamList } from '../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';

type DetailRouteProp = RouteProp<ProjectStackParamList, 'ProjectDetail'>;
type NavigationProp = StackNavigationProp<ProjectStackParamList, 'ProjectDetail'>;

export default function ProjectDetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { projectId } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.headerSurface} elevation={1}>
        <Avatar.Icon size={60} icon="briefcase" style={styles.icon} color="#ffffff" />
        <View style={styles.headerTextContainer}>
          <Text variant="headlineSmall" style={styles.title}>Project Overview</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>ID: {projectId}</Text>
        </View>
      </Surface>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Specifications</Text>
            <Text variant="bodyLarge" style={styles.infoLabel}>Code: <Text style={styles.infoValue}>PRJ-2026-001</Text></Text>
            <Text variant="bodyLarge" style={styles.infoLabel}>Client Name: <Text style={styles.infoValue}>Saudi Aramco</Text></Text>
            <Text variant="bodyLarge" style={styles.infoLabel}>Budget: <Text style={styles.infoValue}>$1,500,000</Text></Text>
            <Text variant="bodyLarge" style={styles.infoLabel}>Actual Cost: <Text style={styles.infoValue}>$450,000</Text></Text>
            <Text variant="bodyLarge" style={styles.infoLabel}>Start Date: <Text style={styles.infoValue}>2026-01-10</Text></Text>
            <Text variant="bodyLarge" style={styles.infoLabel}>End Date: <Text style={styles.infoValue}>2026-12-15</Text></Text>
            <Text variant="bodyLarge" style={styles.infoLabel}>Priority: <Text style={styles.statusCritical}>Critical</Text></Text>
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('ProjectCreateEdit', { projectId })}
              style={styles.actionBtn}
            >
              Edit Project
            </Button>
          </Card.Actions>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e293b',
  },
  icon: {
    backgroundColor: '#2196F3',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  infoValue: {
    fontWeight: 'normal',
    color: '#0f172a',
  },
  statusCritical: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  actionBtn: {
    backgroundColor: '#2196F3',
  },
});
