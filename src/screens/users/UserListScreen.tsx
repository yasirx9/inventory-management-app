import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Badge, 
  FAB, 
  ActivityIndicator, 
  IconButton
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { usePermissions } from '../../hooks/usePermissions';
import { listenToData } from '../../services/database';
import { MoreStackParamList } from '../../navigation/types';
import { User } from '../../types';

type NavigationProp = StackNavigationProp<MoreStackParamList, 'Users'>;

export default function UserListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { can } = usePermissions();
  const hasAccess = can('users.manage');

  useEffect(() => {
    if (!hasAccess) {
      Alert.alert('Permission Denied', 'Access to user management is restricted to Administrators only.');
      navigation.goBack();
    }
  }, [hasAccess]);

  // Database states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!hasAccess) return;

    // Subscribe to users node
    const unsub = listenToData<Record<string, User>>('users', (data) => {
      setUsers(data ? Object.values(data) : []);
      setLoading(false);
    });

    return () => unsub();
  }, [hasAccess]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#ef4444'; // Red
      case 'manager':
        return '#f59e0b'; // Amber
      case 'staff':
      default:
        return '#2196F3'; // Blue
    }
  };

  const renderUserCard = ({ item }: { item: User }) => {
    const roleColor = getRoleColor(item.role);
    
    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate('UserForm', { userId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.leftInfo}>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={styles.userName}>{item.name}</Text>
              
              <Badge style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#10b981' : '#64748b' }]}>
                {item.status}
              </Badge>
            </View>

            <Text variant="bodySmall" style={styles.emailText}>{item.email}</Text>
            {item.department ? (
              <Text variant="bodySmall" style={styles.deptText}>Department: {item.department}</Text>
            ) : null}

            {/* Role Badge */}
            <Badge style={[styles.roleBadge, { backgroundColor: roleColor }]} size={20}>
              {item.role.toUpperCase()}
            </Badge>
          </View>

          <IconButton icon="pencil-outline" size={20} iconColor="#94a3b8" />
        </Card.Content>
      </Card>
    );
  };

  if (!hasAccess) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Verifying administrative clearances...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Syncing user roster...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* List of Users */}
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="account-key-outline" size={60} iconColor="#cbd5e1" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No registered system users.
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserCard}
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

      {/* FAB to Add User */}
      <FAB
        icon="plus"
        label="Add User"
        style={styles.fab}
        onPress={() => navigation.navigate('UserForm', {})}
      />
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  leftInfo: {
    flex: 1,
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 8,
  },
  statusBadge: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emailText: {
    color: '#64748b',
    fontWeight: '500',
  },
  deptText: {
    color: '#475569',
    marginTop: 2,
    fontSize: 12,
  },
  roleBadge: {
    color: '#ffffff',
    fontWeight: 'bold',
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 6,
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
