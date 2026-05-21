import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  FAB, 
  IconButton, 
  ActivityIndicator, 
  Snackbar,
  Dialog,
  Portal,
  Button
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { listenToData, deleteData } from '../../services/database';
import { MoreStackParamList } from '../../navigation/types';
import { Location, ItemLocation } from '../../types';

type NavigationProp = StackNavigationProp<MoreStackParamList, 'Locations'>;

export default function LocationListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);

  // Snackbar Alert States
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  // Delete Dialog States
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // 1. Subscribe to locations
    const unsubLocations = listenToData<Record<string, Location>>('locations', (data) => {
      setLocations(data ? Object.values(data) : []);
      setLoading(false);
    });

    // 2. Subscribe to item_locations to check usage & quantity counts
    const unsubItemLocs = listenToData<Record<string, ItemLocation>>('item_locations', (data) => {
      setItemLocations(data ? Object.values(data) : []);
    });

    return () => {
      unsubLocations();
      unsubItemLocs();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const getStoredItemsCount = (locId: string) => {
    // Count unique items with quantity > 0 in this location
    return itemLocations.filter(il => il.location_id === locId && il.quantity > 0).length;
  };

  const triggerDeleteConfirm = (location: Location) => {
    // 1. Check if location has items stored with active stock
    const count = getStoredItemsCount(location.id);
    if (count > 0) {
      setSnackbarMessage(`Cannot delete location "${location.name}". It is currently holding stock for ${count} unique item(s).`);
      setSnackbarError(true);
      setSnackbarVisible(true);
      return;
    }

    // 2. Open delete confirmation
    setSelectedLocation(location);
    setDeleteDialogVisible(true);
  };

  const handleDeleteExecute = async () => {
    if (!selectedLocation) return;
    setDeleting(true);

    try {
      await deleteData(`locations/${selectedLocation.id}`);
      setDeleteDialogVisible(false);
      setSnackbarMessage(`Location "${selectedLocation.name}" successfully deleted.`);
      setSnackbarError(false);
      setSnackbarVisible(true);
    } catch (e: any) {
      setSnackbarMessage(e.message || 'Error occurred during deletion.');
      setSnackbarError(true);
      setSnackbarVisible(true);
    } finally {
      setDeleting(false);
      setSelectedLocation(null);
    }
  };

  const renderLocationCard = ({ item }: { item: Location }) => {
    const activeItemCount = getStoredItemsCount(item.id);
    
    return (
      <Card 
        style={styles.card}
        onLongPress={() => isAdminOrManager && navigation.navigate('LocationForm', { locationId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.infoCol}>
            <Text variant="titleMedium" style={styles.locName}>{item.name}</Text>
            {item.description ? (
              <Text variant="bodySmall" style={styles.locDesc} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <View style={styles.badgeContainer}>
              <Text style={styles.itemCountText}>
                {activeItemCount} active {activeItemCount === 1 ? 'asset' : 'assets'} stored
              </Text>
            </View>
          </View>
          
          {isAdminOrManager && (
            <View style={styles.actionsCol}>
              <IconButton 
                icon="pencil-outline" 
                size={20} 
                iconColor="#2196F3"
                onPress={() => navigation.navigate('LocationForm', { locationId: item.id })}
              />
              <IconButton 
                icon="trash-can-outline" 
                size={20} 
                iconColor="#ef4444"
                onPress={() => triggerDeleteConfirm(item)}
              />
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching system depots...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <Text variant="bodyMedium" style={styles.bannerText}>
          Configure and manage system storage depots or warehouses. Long-press any card or tap action buttons to modify locations.
        </Text>
      </View>

      {locations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="map-marker-multiple" size={60} iconColor="#cbd5e1" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No storage locations defined.
          </Text>
          {isAdminOrManager && (
            <Button 
              mode="contained" 
              style={styles.emptyBtn} 
              onPress={() => navigation.navigate('LocationForm', {})}
            >
              Add Location
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={locations}
          renderItem={renderLocationCard}
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

      {/* FAB button for quick create */}
      {isAdminOrManager && (
        <FAB
          icon="plus"
          label="New Depot"
          style={styles.fab}
          onPress={() => navigation.navigate('LocationForm', {})}
        />
      )}

      {/* Action Notification Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3500}
        style={{ backgroundColor: snackbarError ? '#ef4444' : '#10b981' }}
      >
        {snackbarMessage}
      </Snackbar>

      {/* Delete Confirmation Portal Dialog */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => !deleting && setDeleteDialogVisible(false)}
        >
          <Dialog.Title style={styles.dialogTitle}>Confirm Delete Action</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Are you sure you want to permanently delete location "{selectedLocation?.name}"? This action is irreversible.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              mode="outlined" 
              onPress={() => setDeleteDialogVisible(false)} 
              disabled={deleting}
              style={styles.dialogBtn}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleDeleteExecute} 
              loading={deleting}
              disabled={deleting}
              style={[styles.dialogBtn, styles.deleteBtn]}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  headerBanner: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bannerText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
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
    paddingVertical: 12,
  },
  infoCol: {
    flex: 1,
    marginRight: 12,
  },
  locName: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  locDesc: {
    color: '#64748b',
    marginTop: 4,
  },
  badgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 8,
  },
  itemCountText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '500',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
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
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#2196F3',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  dialogBtn: {
    marginHorizontal: 4,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
});
