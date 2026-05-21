import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  Avatar,
  List,
  Divider,
  Portal,
  Modal,
  TextInput,
  RadioButton,
  ActivityIndicator
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { listenToData, updateData, pushData, getData, deleteData } from '../../services/database';
import { InventoryStackParamList } from '../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import { Item, ItemLocation, Location, StockMovement } from '../../types';

type DetailRouteProp = RouteProp<InventoryStackParamList, 'InventoryDetail'>;
type NavigationProp = StackNavigationProp<InventoryStackParamList, 'InventoryDetail'>;

export default function InventoryDetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { itemId } = route.params;
  const { userProfile } = useAuth();

  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Loading States
  const [loading, setLoading] = useState(true);

  // Real-time Database States
  const [item, setItem] = useState<Item | null>(null);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  // Modal Adjustment States
  const [adjustVisible, setAdjustVisible] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'adjust'>('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustLocationId, setAdjustLocationId] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    // 1. Subscribe to item details
    const unsubItem = listenToData<Item>(`items/${itemId}`, (data) => {
      setItem(data);
      setLoading(false);
    });

    // 2. Subscribe to all locations (for mapping location names)
    const unsubLocations = listenToData<any>('locations', (data) => {
      const parseList = (d: any): any[] => {
        if (!d) return [];
        if (Array.isArray(d)) {
          return d.filter(Boolean).map((item, idx) => ({
            id: item.id || String(idx),
            ...item
          }));
        }
        if (typeof d === 'object') {
          return Object.entries(d).map(([key, val]: [string, any]) => ({
            id: val.id || key,
            ...val
          }));
        }
        return [];
      };
      setLocations(parseList(data));
    });

    // 3. Subscribe to item locations (stock breakdown per site)
    const unsubItemLocations = listenToData<Record<string, ItemLocation>>('item_locations', (data) => {
      if (data) {
        const filtered = Object.values(data).filter(il => il.item_id === itemId);
        setItemLocations(filtered);
      } else {
        setItemLocations([]);
      }
    });

    // 4. Subscribe to stock movements matching this item (last 10)
    const unsubMovements = listenToData<Record<string, StockMovement>>('stock_movements', (data) => {
      if (data) {
        const filtered = Object.values(data)
          .filter(m => m.item_id === itemId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);
        setMovements(filtered);
      } else {
        setMovements([]);
      }
    });

    return () => {
      unsubItem();
      unsubLocations();
      unsubItemLocations();
      unsubMovements();
    };
  }, [itemId]);

  const getLocationName = (locId: string) => {
    const loc = locations.find(l => l.id === locId);
    return loc ? loc.name : 'Unknown Location';
  };

  const handleDeleteItem = () => {
    Alert.alert('Confirm Delete', 'Are you absolutely sure you want to delete this inventory item? This transaction cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);

            // 1. Delete cascading stock movements
            const allMovements = await getData<Record<string, StockMovement>>('stock_movements');
            if (allMovements) {
              const promises = Object.values(allMovements)
                .filter(m => m.item_id === itemId)
                .map(m => deleteData(`stock_movements/${m.id}`));
              await Promise.all(promises);
            }

            // 2. Delete cascading item locations
            const allLocs = await getData<Record<string, ItemLocation>>('item_locations');
            if (allLocs) {
              const promises = Object.values(allLocs)
                .filter(il => il.item_id === itemId)
                .map(il => deleteData(`item_locations/${il.id}`));
              await Promise.all(promises);
            }

            // 3. Delete the core item node
            await deleteData(`items/${itemId}`);

            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Error occurred during deletion.');
            setLoading(false);
          }
        }
      }
    ]);
  };

  const handleAdjustQuantity = async () => {
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError('Please input a valid quantity greater than 0.');
      return;
    }

    setAdjusting(true);
    setAdjustError('');

    try {
      // 1. Automatically resolve target location ID (where the stock is already available, or first system depot)
      let targetLocationId = '';
      if (itemLocations.length > 0) {
        // Use first active storage site
        targetLocationId = itemLocations[0].location_id;
      } else if (locations.length > 0) {
        // Fallback to first available system depot
        targetLocationId = locations[0].id;
      } else {
        targetLocationId = 'unassigned';
      }

      // Find if location record already exists for this item at this site
      const existingRecord = itemLocations.find(il => il.location_id === targetLocationId);
      let currentLocQty = existingRecord ? existingRecord.quantity : 0;
      let newLocQty = currentLocQty;

      if (adjustType === 'add') {
        newLocQty = currentLocQty + qty;
      } else if (adjustType === 'remove') {
        newLocQty = currentLocQty - qty;
        if (newLocQty < 0) {
          setAdjustError(`Cannot remove ${qty} units. The current location (${getLocationName(targetLocationId)}) only has ${currentLocQty} units.`);
          setAdjusting(false);
          return;
        }
      } else if (adjustType === 'adjust') {
        newLocQty = qty;
      }

      // 1. Update /item_locations node
      if (existingRecord) {
        await updateData(`item_locations/${existingRecord.id}`, { quantity: newLocQty });
      } else {
        await pushData('item_locations', {
          item_id: itemId,
          location_id: targetLocationId,
          quantity: newLocQty
        });
      }

      // 2. Sum up overall item quantities across ALL sites
      const allItemLocs = await getData<Record<string, ItemLocation>>('item_locations');
      let totalQtySum = 0;
      if (allItemLocs) {
        Object.values(allItemLocs).forEach(il => {
          if (il.item_id === itemId) {
            if (il.location_id === targetLocationId) {
              totalQtySum += newLocQty;
            } else {
              totalQtySum += il.quantity;
            }
          }
        });
      } else {
        totalQtySum = newLocQty;
      }

      // If location wasn't in DB yet and no other locations exist
      if (itemLocations.length === 0 && !existingRecord) {
        totalQtySum = newLocQty;
      }

      // 3. Compute new item status
      let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      const reorderLevel = item?.reorder_level || 0;
      if (totalQtySum <= 0) {
        newStatus = 'Out of Stock';
      } else if (totalQtySum <= reorderLevel) {
        newStatus = 'Low Stock';
      }

      // 4. Update the core item node
      await updateData(`items/${itemId}`, {
        quantity: totalQtySum,
        status: newStatus
      });

      // 5. Register Stock Movement Log
      const movementType = adjustType === 'add' ? 'in' : adjustType === 'remove' ? 'out' : 'adjustment';
      const resolvedLocName = targetLocationId !== 'unassigned' ? getLocationName(targetLocationId) : 'Unassigned';
      await pushData('stock_movements', {
        item_id: itemId,
        item_name: item?.item_name || 'Generic Item',
        type: movementType,
        quantity: qty,
        from_location: adjustType === 'remove' ? resolvedLocName : '',
        to_location: adjustType === 'add' ? resolvedLocName : '',
        notes: adjustNotes || `Manual quantity ${adjustType} adjustment`,
        user_id: userProfile?.id || 'unknown_user',
        created_at: new Date().toISOString()
      });

      // Close modal & reset inputs
      setAdjustVisible(false);
      setAdjustQty('');
      setAdjustLocationId('');
      setAdjustNotes('');
    } catch (e: any) {
      setAdjustError(e.message || 'Error occurred during calculation.');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading || !item) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching item specs...</Text>
      </View>
    );
  }

  const overallStatusColor =
    item.quantity <= 0 ? '#ef4444' : item.status === 'Low Stock' ? '#f59e0b' : '#10b981';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Profile header banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Avatar.Icon size={64} icon="package-variant" style={styles.avatarIcon} color="#ffffff" />
        <View style={styles.headerTextContainer}>
          <Text variant="headlineSmall" style={styles.itemTitle}>{item.item_name}</Text>
          <Text variant="bodyMedium" style={styles.skuLabel}>SKU: {item.sku}</Text>
          <View style={[styles.statusBadge, { backgroundColor: overallStatusColor }]}>
            <Text style={styles.statusText}>{item.status || 'In Stock'}</Text>
          </View>
        </View>
      </Surface>

      <View style={styles.content}>
        {/* 2. Specs detail card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Specifications</Text>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Category</Text>
              <Text style={styles.specVal}>{item.category}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Supplier</Text>
              <Text style={styles.specVal}>{item.supplier || 'N/A'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Unit Cost</Text>
              <Text style={styles.specVal}>${parseFloat(String(item.cost || 0)).toFixed(2)}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Reorder Limit</Text>
              <Text style={styles.specVal}>{item.reorder_level} units</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Total Quantity</Text>
              <Text style={[styles.totalQtyVal, { color: overallStatusColor }]}>{item.quantity} units</Text>
            </View>
            {item.description && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.specLabel}>Description</Text>
                <Text style={styles.descVal}>{item.description}</Text>
              </>
            )}
          </Card.Content>

          {isAdminOrManager && (
            <Card.Actions style={styles.cardActions}>
              <Button
                mode="outlined"
                onPress={handleDeleteItem}
                icon="delete"
                textColor="#ef4444"
                style={[styles.actionBtn, { borderColor: '#ef4444' }]}
              >
                Delete
              </Button>
              <Button
                mode="outlined"
                onPress={() => setAdjustVisible(true)}
                icon="swap-vertical"
                style={styles.actionBtn}
              >
                Adjust Stock
              </Button>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('InventoryCreateEdit', { itemId })}
                icon="pencil"
                style={[styles.actionBtn, styles.editBtn]}
              >
                Edit Item
              </Button>
            </Card.Actions>
          )}
        </Card>

        {/* 3. Location breakdown split table */}
        <Text variant="titleMedium" style={styles.sectionHeader}>Storage Breakdown per Site</Text>
        <Card style={styles.listCard}>
          {itemLocations.length === 0 ? (
            <View style={styles.emptyCardContent}>
              <Text style={styles.emptyText}>No storage breakdown entries exist in database.</Text>
            </View>
          ) : (
            itemLocations.map((loc, idx) => (
              <View key={loc.id}>
                {idx > 0 && <Divider />}
                <List.Item
                  title={getLocationName(loc.location_id)}
                  description={`Location ID: ${loc.location_id}`}
                  right={() => (
                    <Text variant="titleLarge" style={styles.locQtyText}>
                      {loc.quantity} <Text style={styles.unitText}>pcs</Text>
                    </Text>
                  )}
                  left={props => <List.Icon {...props} icon="map-marker-radius" color="#2196F3" />}
                />
              </View>
            ))
          )}
        </Card>

        {/* 4. Movements history */}
        <Text variant="titleMedium" style={styles.sectionHeader}>Stock Movements History (Last 10)</Text>
        <Card style={styles.listCard}>
          {movements.length === 0 ? (
            <View style={styles.emptyCardContent}>
              <Text style={styles.emptyText}>No stock movements logged for this item yet.</Text>
            </View>
          ) : (
            movements.map((mov, idx) => {
              const sign = mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : '';
              const signColor = mov.type === 'in' ? '#10b981' : mov.type === 'out' ? '#ef4444' : '#f59e0b';

              return (
                <View key={mov.id}>
                  {idx > 0 && <Divider />}
                  <List.Item
                    title={mov.notes || 'Inventory Audit Adjustment'}
                    description={`${mov.type.toUpperCase()} • By User: ${mov.user_id} • ${new Date(mov.created_at).toLocaleDateString()}`}
                    right={() => (
                      <Text variant="titleMedium" style={[styles.movementSignQty, { color: signColor }]}>
                        {sign}{mov.quantity} pcs
                      </Text>
                    )}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon={mov.type === 'in' ? 'arrow-down-bold-circle' : mov.type === 'out' ? 'arrow-up-bold-circle' : 'alert-circle'}
                        color={signColor}
                      />
                    )}
                  />
                </View>
              );
            })
          )}
        </Card>
      </View>

      {/* 5. Adjust Quantity Modal Wrapper */}
      <Portal>
        <Modal
          visible={adjustVisible}
          onDismiss={() => setAdjustVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Adjust Stock Quantity</Text>
          <Text variant="bodySmall" style={styles.modalSubtitle}>Manually recalculate warehouse values</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Adjustment type selection */}
            <Text style={styles.inputLabel}>Adjustment Method:</Text>
            <RadioButton.Group onValueChange={value => setAdjustType(value as any)} value={adjustType}>
              <View style={styles.radioRow}>
                <View style={styles.radioItem}>
                  <RadioButton value="add" color="#2196F3" />
                  <Text>Add (+)</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="remove" color="#ef4444" />
                  <Text>Remove (-)</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="adjust" color="#f59e0b" />
                  <Text>Override (=)</Text>
                </View>
              </View>
            </RadioButton.Group>



            {/* Quantity Input */}
            <TextInput
              label="Adjustment Quantity"
              value={adjustQty}
              onChangeText={setAdjustQty}
              keyboardType="numeric"
              mode="outlined"
              style={styles.modalInput}
            />

            {/* Notes Input */}
            <TextInput
              label="Audit Justification Notes"
              value={adjustNotes}
              onChangeText={setAdjustNotes}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />

            {adjustError ? <Text style={styles.errorText}>{adjustError}</Text> : null}

            {/* Action buttons */}
            <View style={styles.modalBtnRow}>
              <Button
                mode="outlined"
                onPress={() => setAdjustVisible(false)}
                style={styles.modalBtn}
                disabled={adjusting}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleAdjustQuantity}
                style={[styles.modalBtn, styles.modalSubmitBtn]}
                loading={adjusting}
                disabled={adjusting}
              >
                Apply
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </ScrollView>
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
  headerSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1E3A8A',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  avatarIcon: {
    backgroundColor: '#F59E0B',
    marginRight: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  itemTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  skuLabel: {
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
    marginBottom: 20,
  },
  cardTitle: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  specLabel: {
    fontWeight: 'bold',
    color: '#64748b',
  },
  specVal: {
    color: '#0f172a',
  },
  totalQtyVal: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  descVal: {
    color: '#334155',
    lineHeight: 20,
    marginTop: 6,
  },
  divider: {
    backgroundColor: '#f1f5f9',
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  actionBtn: {
    marginHorizontal: 4,
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  sectionHeader: {
    color: '#475569',
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 15,
    marginTop: 12,
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 1,
    marginBottom: 20,
  },
  emptyCardContent: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  locQtyText: {
    fontWeight: 'bold',
    color: '#0f172a',
    alignSelf: 'center',
  },
  unitText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#64748b',
  },
  movementSignQty: {
    fontWeight: 'bold',
    fontSize: 15,
    alignSelf: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    maxHeight: '85%',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalSubtitle: {
    color: '#64748b',
    marginBottom: 16,
  },
  modalScroll: {
    marginTop: 8,
  },
  inputLabel: {
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
  },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerTrigger: {
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 8,
  },
  pickerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  pickerDropdown: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 4,
    maxHeight: 120,
    overflow: 'scroll',
    marginBottom: 12,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalInput: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    marginHorizontal: 6,
  },
  modalSubmitBtn: {
    backgroundColor: '#2196F3',
  },
});
