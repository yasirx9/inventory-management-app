import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Badge, 
  FAB, 
  ActivityIndicator, 
  SegmentedButtons,
  ProgressBar,
  IconButton
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { listenToData } from '../../services/database';
import { ProjectStackParamList } from '../../navigation/types';
import { Project } from '../../types';

type NavigationProp = StackNavigationProp<ProjectStackParamList, 'ProjectList'>;

export default function ProjectListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterMode, setFilterMode] = useState<string>('all');

  useEffect(() => {
    // Subscribe to projects node
    const unsub = listenToData<Record<string, Project>>('projects', (data) => {
      setProjects(data ? Object.values(data) : []);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning':
        return '#2196F3'; // Blue
      case 'Active':
        return '#10b981'; // Green
      case 'On Hold':
        return '#f59e0b'; // Amber
      case 'Completed':
        return '#6366f1'; // Violet/Indigo
      case 'Cancelled':
      default:
        return '#ef4444'; // Red
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return '#ef4444'; // Red
      case 'High':
        return '#f97316'; // Orange
      case 'Medium':
        return '#3b82f6'; // Light Blue
      case 'Low':
      default:
        return '#94a3b8'; // Slate
    }
  };

  // Filter in-memory
  const filteredProjects = projects.filter(p => {
    if (filterMode === 'all') return true;
    return p.status === filterMode;
  });

  const renderProjectCard = ({ item }: { item: Project }) => {
    const statusColor = getStatusColor(item.status);
    const priorityColor = getPriorityColor(item.priority);

    // Calculate budget burn rate
    const budgetVal = item.budget || 1;
    const actualVal = item.actual_cost || 0;
    const progress = Math.min(1, actualVal / budgetVal);
    const progressPercent = Math.round(progress * 100);

    // Progress bar color based on usage
    const progressColor = progress >= 0.9 ? '#ef4444' : progress >= 0.7 ? '#f59e0b' : '#2196F3';

    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
      >
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" style={styles.projName}>{item.name}</Text>
            <Badge style={[styles.badge, { backgroundColor: statusColor }]} size={18}>
              {item.status}
            </Badge>
          </View>

          <Text variant="bodySmall" style={styles.codeText}>Code: {item.project_code}</Text>
          <Text variant="bodyMedium" style={styles.clientText}>Client: {item.client_name}</Text>

          {/* Priority Row */}
          <View style={styles.priorityRow}>
            <Text variant="bodySmall" style={styles.priorityLabel}>Priority: </Text>
            <Badge style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
              {item.priority}
            </Badge>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
              <Text variant="bodySmall" style={styles.progressLabel}>Budget Consumed</Text>
              <Text variant="bodySmall" style={[styles.progressVal, { color: progressColor }]}>
                {progressPercent}% (${actualVal.toLocaleString()} / ${budgetVal.toLocaleString()})
              </Text>
            </View>
            <ProgressBar 
              progress={progress} 
              color={progressColor} 
              style={styles.progressBar} 
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching system projects...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Status Filter Segment */}
      <View style={styles.filterSection}>
        <SegmentedButtons
          value={filterMode}
          onValueChange={setFilterMode}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'Planning', label: 'Plan' },
            { value: 'Active', label: 'Active' },
            { value: 'On Hold', label: 'Hold' },
            { value: 'Completed', label: 'Done' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* 2. FlatList of Projects */}
      {filteredProjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="briefcase-variant" size={60} iconColor="#cbd5e1" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No projects match the current filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          renderItem={renderProjectCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh} 
              colors={['#2196F3']} 
            />
          }
        />
      )}

      {/* 3. FAB to Add Project */}
      {isAdminOrManager && (
        <FAB
          icon="plus"
          label="New Project"
          style={styles.fab}
          onPress={() => navigation.navigate('ProjectCreateEdit', {})}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
  },
  filterSection: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  segmentedButtons: {
    backgroundColor: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projName: {
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    color: '#ffffff',
    fontWeight: 'bold',
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  codeText: {
    color: '#64748b',
    fontWeight: '500',
  },
  clientText: {
    color: '#334155',
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  priorityLabel: {
    color: '#64748b',
  },
  priorityBadge: {
    color: '#ffffff',
    fontWeight: 'bold',
    borderRadius: 4,
  },
  progressSection: {
    marginTop: 14,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#64748b',
    fontWeight: '500',
  },
  progressVal: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});
