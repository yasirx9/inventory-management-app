import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, FAB, Searchbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProjectStackParamList } from '../navigation/types';

type NavigationProp = StackNavigationProp<ProjectStackParamList, 'ProjectList'>;

interface ProjectItem {
  id: string;
  project_code: string;
  name: string;
  client: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
}

export default function ProjectListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [search, setSearch] = useState('');

  const [projects] = useState<ProjectItem[]>([
    { id: 'proj_1', project_code: 'PRJ-2026-001', name: 'Al-Khobar Supply Project', client: 'Saudi Aramco', status: 'Active' },
    { id: 'proj_2', project_code: 'PRJ-2026-002', name: 'Jeddah Warehouse Setup', client: 'Binladen Group', status: 'Planning' },
  ]);

  const renderProject = ({ item }: { item: ProjectItem }) => (
    <Card 
      style={styles.card} 
      onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text variant="titleMedium" style={styles.codeText}>{item.project_code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'Active' ? '#dcfce7' : '#fef9c3' }]}>
            <Text style={{ color: item.status === 'Active' ? '#15803d' : '#854d0e', fontSize: 12, fontWeight: 'bold' }}>
              {item.status}
            </Text>
          </View>
        </View>
        <Text variant="headlineSmall" style={styles.titleText}>{item.name}</Text>
        <Text variant="bodyMedium" style={styles.clientText}>Client: {item.client}</Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search projects..."
        onChangeText={setSearch}
        value={search}
        style={styles.searchbar}
      />
      <FlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
      />
      <FAB
        icon="plus"
        label="New Project"
        style={styles.fab}
        onPress={() => navigation.navigate('ProjectCreateEdit', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchbar: {
    margin: 16,
    backgroundColor: '#ffffff',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeText: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  titleText: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  clientText: {
    color: '#64748b',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});
