import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Badge, 
  FAB, 
  ActivityIndicator, 
  SegmentedButtons,
  IconButton
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { listenToData } from '../../services/database';
import { TransferStackParamList } from '../../navigation/types';
import { StockTransfer } from '../../types';

type NavigationProp = StackNavigationProp<TransferStackParamList, 'TransferList'>;

export default function TransferListScreen() {
  const navigation = useNavigation<NavigationProp>();

  // Database Resources
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);

  // Filter Segment Mode: 'all' | 'Pending' | 'Approved' | 'Completed'
  const [filterMode, setFilterMode] = useState<string>('all');

  useEffect(() => {
    // Subscribe to stock transfers collection
    const unsubTransfers = listenToData<Record<string, StockTransfer>>('stock_transfers', (data) => {
      if (data) {
        // Sort by created_at desc
        const sorted = Object.values(data).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTransfers(sorted);
      } else {
        setTransfers([]);
      }
      setLoading(false);
    });

    return () => unsubTransfers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#f59e0b'; // Amber
      case 'Approved':
        return '#2196F3'; // Blue
      case 'Completed':
        return '#10b981'; // Green
      case 'Rejected':
      case 'Receipt Rejected':
        return '#ef4444'; // Red
      default:
        return '#64748b'; // Slate
    }
  };

  // Filter items in memory
  const filteredTransfers = transfers.filter(t => {
    if (filterMode === 'all') return true;
    return t.status === filterMode;
  });

  const renderTransferCard = ({ item }: { item: StockTransfer }) => {
    const badgeColor = getStatusColor(item.status);
    
    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate('TransferDetail', { transferId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" style={styles.itemTitle}>{item.item_name}</Text>
            <Badge style={[styles.badge, { backgroundColor: badgeColor }]} size={20}>
              {item.status}
            </Badge>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.locationBlock}>
              <Text variant="bodySmall" style={styles.locLabel}>FROM</Text>
              <Text variant="bodyMedium" style={styles.locName}>{item.from_location_name}</Text>
            </View>
            
            <IconButton icon="arrow-right-thick" size={16} iconColor="#64748b" style={styles.arrowIcon} />
            
            <View style={styles.locationBlock}>
              <Text variant="bodySmall" style={styles.locLabel}>TO</Text>
              <Text variant="bodyMedium" style={styles.locName}>{item.to_location_name}</Text>
            </View>
          </View>

          <View style={styles.footerRow}>
            <Text variant="bodySmall" style={styles.dateText}>
              Requested: {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <Text variant="titleMedium" style={styles.qtyText}>
              Qty: <Text style={[styles.qtyNum, { color: badgeColor }]}>{item.quantity}</Text> pcs
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Syncing stock transit logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Category Segmented Filter Row */}
      <View style={styles.filterSection}>
        <SegmentedButtons
          value={filterMode}
          onValueChange={setFilterMode}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'Pending', label: 'Pending' },
            { value: 'Approved', label: 'Approved' },
            { value: 'Completed', label: 'Done' }
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* 2. Content Body List */}
      {filteredTransfers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="swap-horizontal" size={60} iconColor="#cbd5e1" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No stock transfers match the current filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTransfers}
          renderItem={renderTransferCard}
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

      {/* 3. FAB to request new transit */}
      <FAB
        icon="plus"
        label="Request Transfer"
        style={styles.fab}
        onPress={() => navigation.navigate('TransferCreate')}
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
  cardContent: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
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
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderColor: '#f1f5f9',
    borderWidth: 1,
  },
  locationBlock: {
    flex: 1,
  },
  locLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  locName: {
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  arrowIcon: {
    margin: 0,
    alignSelf: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  dateText: {
    color: '#94a3b8',
  },
  qtyText: {
    color: '#64748b',
  },
  qtyNum: {
    fontWeight: 'bold',
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
