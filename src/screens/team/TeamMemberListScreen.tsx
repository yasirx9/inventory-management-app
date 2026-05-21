import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Badge, 
  FAB, 
  ActivityIndicator, 
  Searchbar,
  IconButton
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { listenToData } from '../../services/database';
import { MoreStackParamList } from '../../navigation/types';
import { TeamMember } from '../../types';

type NavigationProp = StackNavigationProp<MoreStackParamList, 'TeamMembers'>;

export default function TeamMemberListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Database Resources
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Subscribe to team members node
    const unsub = listenToData<Record<string, TeamMember>>('team_members', (data) => {
      setMembers(data ? Object.values(data) : []);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const getDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const checkExpiryWarning = (item: TeamMember) => {
    const iqamaDays = getDaysRemaining(item.iqama_expiry);
    const passportDays = getDaysRemaining(item.passport_expiry);
    return iqamaDays <= 30 || passportDays <= 30;
  };

  const getMinDays = (item: TeamMember) => {
    const iqamaDays = getDaysRemaining(item.iqama_expiry);
    const passportDays = getDaysRemaining(item.passport_expiry);
    return Math.min(iqamaDays, passportDays);
  };

  // Filter list in-memory based on name search query
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMemberCard = ({ item }: { item: TeamMember }) => {
    const isWarning = checkExpiryWarning(item);
    const minDays = getMinDays(item);
    
    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate('TeamMemberDetail', { memberId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.leftInfo}>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={styles.memberName}>{item.name}</Text>
              <Badge 
                style={[
                  styles.statusBadge, 
                  { backgroundColor: item.status === 'active' ? '#10b981' : '#64748b' }
                ]}
              >
                {item.status}
              </Badge>
            </View>

            <Text variant="bodySmall" style={styles.roleText}>{item.role} • {item.department}</Text>

            {isWarning && (
              <View style={styles.warningRow}>
                <IconButton icon="alert-circle" iconColor="#ef4444" size={16} style={styles.warningIcon} />
                <Text variant="bodySmall" style={styles.warningText}>
                  {minDays <= 0 ? 'Document Expired!' : `Document Expiry alert: ${minDays} days remaining!`}
                </Text>
              </View>
            )}
          </View>

          <IconButton icon="chevron-right" size={24} iconColor="#94a3b8" />
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Syncing staff ledger...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Search Bar */}
      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Search team member by name..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
      </View>

      {/* 2. FlatList */}
      {filteredMembers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="account-group-outline" size={60} iconColor="#cbd5e1" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No team members found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberCard}
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

      {/* 3. FAB to add team member */}
      {isAdminOrManager && (
        <FAB
          icon="plus"
          label="Add Member"
          style={styles.fab}
          onPress={() => navigation.navigate('TeamMemberForm', {})}
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
  searchSection: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    height: 48,
  },
  searchInput: {
    minHeight: 48,
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
  memberName: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginRight: 8,
  },
  statusBadge: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  roleText: {
    color: '#64748b',
    fontWeight: '500',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fee2e2',
    borderWidth: 1,
    borderRadius: 6,
    paddingRight: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  warningIcon: {
    margin: 0,
  },
  warningText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 11,
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
