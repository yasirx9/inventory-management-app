import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Surface,
  IconButton,
  List,
  Divider,
  ActivityIndicator,
  Portal,
  Modal,
  RadioButton,
  Button,
  TextInput
} from 'react-native-paper';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listenToData, updateData, pushData, getData } from '../services/database';
import {
  Item,
  Category,
  Project,
  StockTransfer,
  Supplier,
  TeamMember,
  StockMovement,
  ItemLocation,
  Location
} from '../types';

export default function DashboardScreen() {
  const { userProfile, logout } = useAuth();
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Loading state (resolves once primary records load)
  const [initLoading, setInitLoading] = useState(true);

  // Real-time Database state
  const [items, setItems] = useState<Item[]>([]);
  const [categoriesCount, setCategoriesCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [teamMembersCount, setTeamMembersCount] = useState(0);
  const [recentMovements, setRecentMovements] = useState<StockMovement[]>([]);

  // Adjustment Modal States
  const [adjustVisible, setAdjustVisible] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'adjust'>('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  // Item Selection States for Dashboard Modal
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedItemName, setSelectedItemName] = useState('');
  const [preselected, setPreselected] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Storage locations matching database
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Computed metrics from real-time items list
  const totalItems = items.length;
  const lowStockItems = items.filter(
    item => item.quantity <= item.reorder_level && item.quantity > 0
  );
  const lowStockCount = lowStockItems.length;
  const outOfStockItems = items.filter(
    item => item.quantity <= 0 || item.status === 'Out of Stock'
  );
  const outOfStockCount = outOfStockItems.length;

  useEffect(() => {
    // 1. Listen to inventory items
    const unsubItems = listenToData<Record<string, Item>>('items', (data) => {
      if (data) {
        setItems(Object.values(data));
      } else {
        setItems([]);
      }
      setInitLoading(false);
    });

    // 2. Listen to categories
    const unsubCategories = listenToData<Record<string, Category>>('categories', (data) => {
      setCategoriesCount(data ? Object.keys(data).length : 0);
    });

    // 3. Listen to projects (filter active in state)
    const unsubProjects = listenToData<Record<string, Project>>('projects', (data) => {
      if (data) {
        const active = Object.values(data).filter(p => p.status === 'Active').length;
        setActiveProjectsCount(active);
      } else {
        setActiveProjectsCount(0);
      }
    });

    // 4. Listen to transfers (filter pending in state)
    const unsubTransfers = listenToData<Record<string, StockTransfer>>('stock_transfers', (data) => {
      if (data) {
        const pending = Object.values(data).filter(t => t.status === 'Pending').length;
        setPendingTransfersCount(pending);
      } else {
        setPendingTransfersCount(0);
      }
    });

    // 5. Listen to suppliers
    const unsubSuppliers = listenToData<Record<string, Supplier>>('suppliers', (data) => {
      setSuppliersCount(data ? Object.keys(data).length : 0);
    });

    // 6. Listen to team members
    const unsubTeam = listenToData<Record<string, TeamMember>>('team_members', (data) => {
      setTeamMembersCount(data ? Object.keys(data).length : 0);
    });

    // 7. Listen to recent stock movements (last 5 entries)
    const unsubMovements = listenToData<Record<string, StockMovement>>('stock_movements', (data) => {
      if (data) {
        const movementsList = Object.values(data)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5);
        setRecentMovements(movementsList);
      } else {
        setRecentMovements([]);
      }
    });

    // 8. Listen to item locations
    const unsubItemLocations = listenToData<Record<string, ItemLocation>>('item_locations', (data) => {
      setItemLocations(data ? Object.values(data) : []);
    });

    // 9. Listen to locations
    const unsubLocations = listenToData<Record<string, Location>>('locations', (data) => {
      setLocations(data ? Object.values(data) : []);
    });

    // Unsubscribe all listeners on component unmount
    return () => {
      unsubItems();
      unsubCategories();
      unsubProjects();
      unsubTransfers();
      unsubSuppliers();
      unsubTeam();
      unsubMovements();
      unsubItemLocations();
      unsubLocations();
    };
  }, []);

  const handleAdjustQuantity = async () => {
    if (!selectedItemId) {
      setAdjustError('Please select a valid inventory item to adjust.');
      return;
    }

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
      const matchingItemLocs = itemLocations.filter(il => il.item_id === selectedItemId);

      if (matchingItemLocs.length > 0) {
        // Use first active storage site
        targetLocationId = matchingItemLocs[0].location_id;
      } else if (locations.length > 0) {
        // Fallback to first available system depot
        targetLocationId = locations[0].id;
      } else {
        targetLocationId = 'unassigned';
      }

      // Find if location record already exists for this item at this site
      const existingRecord = matchingItemLocs.find(il => il.location_id === targetLocationId);
      let currentLocQty = existingRecord ? existingRecord.quantity : 0;
      let newLocQty = currentLocQty;

      if (adjustType === 'add') {
        newLocQty = currentLocQty + qty;
      } else if (adjustType === 'remove') {
        newLocQty = currentLocQty - qty;
        if (newLocQty < 0) {
          const locName = locations.find(l => l.id === targetLocationId)?.name || 'Unknown Location';
          setAdjustError(`Cannot remove ${qty} units. The current location (${locName}) only has ${currentLocQty} units.`);
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
          item_id: selectedItemId,
          location_id: targetLocationId,
          quantity: newLocQty
        });
      }

      // 2. Sum up overall item quantities across ALL sites
      const allItemLocs = await getData<Record<string, ItemLocation>>('item_locations');
      let totalQtySum = 0;
      if (allItemLocs) {
        Object.values(allItemLocs).forEach(il => {
          if (il.item_id === selectedItemId) {
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
      if (matchingItemLocs.length === 0 && !existingRecord) {
        totalQtySum = newLocQty;
      }

      // 3. Compute new item status
      let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      const selectedItem = items.find(i => i.id === selectedItemId);
      const reorderLevel = selectedItem?.reorder_level || 0;
      if (totalQtySum <= 0) {
        newStatus = 'Out of Stock';
      } else if (totalQtySum <= reorderLevel) {
        newStatus = 'Low Stock';
      }

      // 4. Update the core item node
      await updateData(`items/${selectedItemId}`, {
        quantity: totalQtySum,
        status: newStatus
      });

      // 5. Register Stock Movement Log
      const movementType = adjustType === 'add' ? 'in' : adjustType === 'remove' ? 'out' : 'adjustment';
      const resolvedLocName = targetLocationId !== 'unassigned'
        ? (locations.find(l => l.id === targetLocationId)?.name || 'Unknown Location')
        : 'Unassigned';

      await pushData('stock_movements', {
        item_id: selectedItemId,
        item_name: selectedItemName || 'Generic Item',
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
      setAdjustNotes('');
      setSelectedItemId('');
      setSelectedItemName('');
    } catch (e: any) {
      setAdjustError(e.message || 'Error occurred during calculation.');
    } finally {
      setAdjusting(false);
    }
  };

  if (initLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Syncing Database Real-time Ledger...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* 1. Header with custom welcome & signout */}
      <Surface style={styles.headerSurface} elevation={2}>
        <View style={styles.headerInfo}>
          <Avatar.Text
            size={40}
            label={userProfile?.name?.slice(0, 2).toUpperCase() || 'US'}
            style={styles.avatar}
          />
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeSub}>Welcome back,</Text>
            <Text style={styles.welcomeTitle}>{userProfile?.name || 'Administrator'}</Text>
          </View>
        </View>
        <IconButton
          icon={({ size, color }) => <FontAwesome name="sign-out" size={size} color={color} />}
          iconColor="#ef4444"
          size={24}
          onPress={logout}
          style={styles.logoutBtn}
        />
      </Surface>

      <View style={styles.content}>

        {/* 2. Stats Grid Row 1 (Inventory) */}
        <Text variant="titleMedium" style={styles.sectionHeader}>Inventory Status</Text>
        <View style={styles.grid}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="cube" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}
                color="#2196F3"
              />
              <Text style={styles.cardNumber}>{totalItems}</Text>
              <Text style={styles.cardLabel}>Total Items</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="exclamation-triangle" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
                color="#f59e0b"
              />
              <Text style={styles.cardNumber}>{lowStockCount}</Text>
              <Text style={styles.cardLabel}>Low Stock</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="times-circle" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                color="#ef4444"
              />
              <Text style={styles.cardNumber}>{outOfStockCount}</Text>
              <Text style={styles.cardLabel}>Out of Stock</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="tags" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}
                color="#10b981"
              />
              <Text style={styles.cardNumber}>{categoriesCount}</Text>
              <Text style={styles.cardLabel}>Categories</Text>
            </Card.Content>
          </Card>
        </View>

        {/* 3. Stats Grid Row 2 (Operations) */}
        <Text variant="titleMedium" style={[styles.sectionHeader, { marginTop: 12 }]}>Operational Metrics</Text>
        <View style={styles.grid}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="briefcase" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}
                color="#8b5cf6"
              />
              <Text style={styles.cardNumber}>{activeProjectsCount}</Text>
              <Text style={styles.cardLabel}>Active Projects</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="exchange" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]}
                color="#06b6d4"
              />
              <Text style={styles.cardNumber}>{pendingTransfersCount}</Text>
              <Text style={styles.cardLabel}>Pending Transits</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="truck" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}
                color="#ec4899"
              />
              <Text style={styles.cardNumber}>{suppliersCount}</Text>
              <Text style={styles.cardLabel}>Total Suppliers</Text>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Avatar.Icon
                size={32}
                icon={({ size, color }) => <FontAwesome name="users" size={size - 4} color={color} />}
                style={[styles.cardIcon, { backgroundColor: 'rgba(100, 116, 139, 0.1)' }]}
                color="#64748b"
              />
              <Text style={styles.cardNumber}>{teamMembersCount}</Text>
              <Text style={styles.cardLabel}>Team Members</Text>
            </Card.Content>
          </Card>
        </View>

        {/* 4. Low Stock Alerts */}
        {lowStockCount > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionTitleRow}>
              <Text variant="titleMedium" style={styles.sectionTitleDanger}>Critical Low Stock Warnings</Text>
              <View style={styles.alertIndicator} />
            </View>
            <Card style={styles.dangerCard}>
              <View>
                {lowStockItems.slice(0, 4).map((item, idx) => (
                  <View key={item.id}>
                    {idx > 0 && <Divider />}
                    <View style={styles.lowStockRow}>
                      <FontAwesome name="exclamation-triangle" size={16} color="#f59e0b" style={styles.lowStockIcon} />
                      <View style={styles.lowStockTextCol}>
                        <Text style={styles.lowStockTitle}>{item.item_name}</Text>
                        <Text style={styles.lowStockDesc}>
                          SKU: {item.sku} • Stock Left: {item.quantity} (Reorder Limit: {item.reorder_level})
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )}

        {/* 5. Recent Stock Movements */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text variant="titleMedium" style={[styles.sectionHeader, { marginBottom: 0 }]}>Recent Stock Movements</Text>
            {isAdminOrManager && (
              <Button
                mode="contained-tonal"
                icon={({ size, color }) => <FontAwesome name="sliders" size={size} color={color} />}
                onPress={() => {
                  setPreselected(false);
                  setSelectedItemId('');
                  setSelectedItemName('');
                  setAdjustType('add');
                  setAdjustQty('');
                  setAdjustNotes('');
                  setAdjustError('');
                  setAdjustVisible(true);
                }}
                labelStyle={styles.adjustBtnLabel}
                style={styles.adjustHeaderBtn}
              >
                Adjust Stock
              </Button>
            )}
          </View>
          <Card style={styles.listCard}>
            {recentMovements.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recent movements recorded in database.</Text>
              </View>
            ) : (
              <View>
                {recentMovements.map((item, idx) => {
                  let badgeColor = 'rgba(100, 116, 139, 0.1)';
                  let iconName: any = 'exchange';
                  let iconColor = '#64748b';

                  if (item.type === 'in') {
                    badgeColor = 'rgba(16, 185, 129, 0.1)';
                    iconName = 'arrow-circle-down';
                    iconColor = '#10b981';
                  } else if (item.type === 'out') {
                    badgeColor = 'rgba(239, 68, 68, 0.1)';
                    iconName = 'arrow-circle-up';
                    iconColor = '#ef4444';
                  } else if (item.type === 'adjustment') {
                    badgeColor = 'rgba(245, 158, 11, 0.1)';
                    iconName = 'wrench';
                    iconColor = '#f59e0b';
                  } else if (item.type === 'transfer') {
                    badgeColor = 'rgba(59, 130, 246, 0.1)';
                    iconName = 'exchange';
                    iconColor = '#3b82f6';
                  }

                  return (
                    <View key={item.id}>
                      {idx > 0 && <Divider />}
                      <View style={styles.movementRow}>
                        <View style={[styles.customBadge, { backgroundColor: badgeColor }]}>
                          <FontAwesome name={iconName} size={14} color={iconColor} />
                        </View>

                        <View style={styles.movementTextCol}>
                          <Text style={styles.movementItemName} numberOfLines={1}>{item.item_name}</Text>
                          <Text style={styles.movementMeta}>
                            {item.type.toUpperCase()} • Qty: {item.quantity} • {new Date(item.created_at).toLocaleDateString()}
                          </Text>
                        </View>

                        <View style={styles.rightActionContainer}>
                          <Text style={styles.movementNote} numberOfLines={1}>
                            {item.notes || 'No description'}
                          </Text>
                          {isAdminOrManager && (
                            <IconButton
                              icon={({ size, color }) => <FontAwesome name="wrench" size={size} color={color} />}
                              size={18}
                              iconColor="#2196F3"
                              style={styles.quickAdjustBtn}
                              onPress={() => {
                                setPreselected(true);
                                setSelectedItemId(item.item_id);
                                setSelectedItemName(item.item_name);
                                setAdjustType('add');
                                setAdjustQty('');
                                setAdjustNotes('');
                                setAdjustError('');
                                setAdjustVisible(true);
                              }}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>

      </View>

      {/* Manual Quick Stock Adjustment Modal Wrapper */}
      <Portal>
        <Modal
          visible={adjustVisible}
          onDismiss={() => {
            setAdjustVisible(false);
            setItemSearchQuery('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>Adjust Stock Quantity</Text>
          <Text variant="bodySmall" style={styles.modalSubtitle}>Manually recalculate warehouse values</Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* 1. Item Selection (if not pre-selected) */}
            {!preselected ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Select Item to Adjust:</Text>
                <TextInput
                  label="Search items..."
                  value={itemSearchQuery}
                  onChangeText={setItemSearchQuery}
                  mode="outlined"
                  dense
                  style={styles.modalInput}
                  left={<TextInput.Icon icon={({ size, color }) => <FontAwesome name="search" size={size} color={color} />} />}
                />

                {itemSearchQuery.trim().length > 0 && (
                  <Surface style={styles.searchResultsContainer} elevation={1}>
                    {items
                      .filter(i => i.item_name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                      .slice(0, 5)
                      .map(i => (
                        <TouchableOpacity
                          key={i.id}
                          style={styles.searchResultItem}
                          onPress={() => {
                            setSelectedItemId(i.id);
                            setSelectedItemName(i.item_name);
                            setItemSearchQuery('');
                          }}
                        >
                          <Text style={{ fontWeight: '500' }}>{i.item_name}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>SKU: {i.sku} • Stock: {i.quantity}</Text>
                        </TouchableOpacity>
                      ))}
                  </Surface>
                )}

                {selectedItemId ? (
                  <Surface style={styles.selectedItemBadge} elevation={1}>
                    <Text style={styles.selectedItemText} numberOfLines={1}>Selected: {selectedItemName}</Text>
                    <IconButton
                      icon={({ size, color }) => <FontAwesome name="times-circle" size={size} color={color} />}
                      size={18}
                      iconColor="#ef4444"
                      onPress={() => {
                        setSelectedItemId('');
                        setSelectedItemName('');
                      }}
                      style={{ margin: 0 }}
                    />
                  </Surface>
                ) : null}
              </View>
            ) : (
              <Surface style={[styles.selectedItemBadge, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', marginBottom: 16 }]} elevation={1}>
                <Text style={[styles.selectedItemText, { color: '#1e40af' }]} numberOfLines={1}>Item: {selectedItemName}</Text>
              </Surface>
            )}

            {/* 2. Adjustment type selection */}
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

            {/* 3. Quantity Input */}
            <TextInput
              label="Adjustment Quantity"
              value={adjustQty}
              onChangeText={setAdjustQty}
              keyboardType="numeric"
              mode="outlined"
              style={styles.modalInput}
            />

            {/* 4. Notes Input */}
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
                onPress={() => {
                  setAdjustVisible(false);
                  setItemSearchQuery('');
                }}
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
    backgroundColor: '#ffffff',
  },
  loadingText: {
    color: '#1E3A8A',
    marginTop: 16,
    fontSize: 15,
  },
  headerSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E3A8A', // Premium Royal Navy Header
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginRight: 12,
  },
  welcomeTextContainer: {
    flexDirection: 'column',
  },
  welcomeSub: {
    color: '#64748b',
    fontSize: 12,
  },
  welcomeTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    margin: 0,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: '#475569',
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    lineHeight: 28,
  },
  cardLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionContainer: {
    marginTop: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleDanger: {
    color: '#b45309',
    fontWeight: 'bold',
    fontSize: 15,
  },
  alertIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    marginLeft: 8,
  },
  dangerCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
    borderRadius: 12,
    elevation: 1,
  },
  lowStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  lowStockIcon: {
    marginRight: 12,
  },
  lowStockTextCol: {
    flex: 1,
  },
  lowStockTitle: {
    color: '#78350f',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lowStockDesc: {
    color: '#b45309',
    fontSize: 12,
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 1,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  customBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movementTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  movementItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  movementMeta: {
    fontSize: 11,
    color: '#64748b',
  },
  movementNote: {
    color: '#64748b',
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginRight: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adjustHeaderBtn: {
    borderRadius: 8,
    margin: 0,
  },
  adjustBtnLabel: {
    fontSize: 12,
    marginVertical: 4,
  },
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 150,
  },
  quickAdjustBtn: {
    margin: 0,
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
    fontSize: 20,
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
  modalInput: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  searchResultsContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 180,
    marginBottom: 16,
    overflow: 'hidden',
  },
  searchResultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    marginBottom: 16,
  },
  selectedItemText: {
    color: '#166534',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
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
