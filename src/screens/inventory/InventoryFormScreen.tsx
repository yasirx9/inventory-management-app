import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  ActivityIndicator
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { 
  getData, 
  pushData, 
  updateData,
  deleteData
} from '../../services/database';
import { InventoryStackParamList } from '../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  Item, 
  Category, 
  Supplier, 
  Location 
} from '../../types';

type FormRouteProp = RouteProp<InventoryStackParamList, 'InventoryCreateEdit'>;
type NavigationProp = StackNavigationProp<InventoryStackParamList, 'InventoryCreateEdit'>;

export default function InventoryFormScreen() {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const itemId = route.params?.itemId;
  const isEditMode = !!itemId;

  const { userProfile } = useAuth();

  // Loading States
  const [initLoading, setInitLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Database Dropdown Resources
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Dropdown Open Toggles
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Form State Values
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [reorderLevel, setReorderLevel] = useState('10');
  const [locationId, setLocationId] = useState('');
  const [initialQty, setInitialQty] = useState('0');

  // Input Verification
  const [error, setError] = useState('');

  useEffect(() => {
    // 1. Fetch dropdown categories, suppliers, locations on mount
    const loadResources = async () => {
      try {
        const catData = await getData<any>('categories');
        const supData = await getData<any>('suppliers');
        const locData = await getData<any>('locations');

        const parseList = (data: any): any[] => {
          if (!data) return [];
          if (Array.isArray(data)) {
            return data.filter(Boolean).map((item, idx) => ({
              id: item.id || String(idx),
              ...item
            }));
          }
          if (typeof data === 'object') {
            return Object.entries(data).map(([key, val]: [string, any]) => ({
              id: val.id || key,
              ...val
            }));
          }
          return [];
        };

        setCategories(parseList(catData));
        setSuppliers(parseList(supData));
        setLocations(parseList(locData));

        // 2. If in Edit mode, fetch current item values
        if (isEditMode && itemId) {
          const currentItem = await getData<Item>(`items/${itemId}`);
          if (currentItem) {
            setName(currentItem.item_name);
            setSku(currentItem.sku);
            setCategory(currentItem.category);
            setDescription(currentItem.description || '');
            setCost(String(currentItem.cost || ''));
            setSupplier(currentItem.supplier || '');
            setReorderLevel(String(currentItem.reorder_level || '10'));
            // Note: initialQty is locked in edit mode
            setInitialQty(String(currentItem.quantity || '0'));
          }
        }
      } catch (e) {
        console.error('Error fetching specs config:', e);
      } finally {
        setInitLoading(false);
      }
    };

    loadResources();
  }, [itemId, isEditMode]);

  // Generate unique item SKU code if empty: ITM-00001, ITM-00002...
  const generateSkuCode = async () => {
    try {
      const allItems = await getData<Record<string, Item>>('items');
      if (!allItems) return 'ITM-00001';

      let maxIndex = 0;
      Object.values(allItems).forEach(item => {
        if (item.sku && item.sku.startsWith('ITM-')) {
          const numPart = parseInt(item.sku.replace('ITM-', ''));
          if (!isNaN(numPart) && numPart > maxIndex) {
            maxIndex = numPart;
          }
        }
      });

      const nextNum = maxIndex + 1;
      const paddedNum = String(nextNum).padStart(5, '0');
      return `ITM-${paddedNum}`;
    } catch {
      return 'ITM-00001';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Item Name is a required field.');
      return;
    }
    if (!category) {
      setError('Please select a category classification.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let finalSku = sku.trim();
      if (!finalSku) {
        finalSku = await generateSkuCode();
      }

      const costVal = parseFloat(cost) || 0;
      const reorderLevelVal = parseInt(reorderLevel) || 10;
      const parsedQty = parseInt(initialQty) || 0;

      let statusVal: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (parsedQty <= 0) {
        statusVal = 'Out of Stock';
      } else if (parsedQty <= reorderLevelVal) {
        statusVal = 'Low Stock';
      }

      if (isEditMode && itemId) {
        // --- Edit Mode Update ---
        await updateData(`items/${itemId}`, {
          item_name: name.trim(),
          sku: finalSku,
          category,
          description: description.trim(),
          cost: costVal,
          supplier,
          reorder_level: reorderLevelVal,
          status: statusVal
        });

        // Register stock specification adjustment
        await pushData('stock_movements', {
          item_id: itemId,
          item_name: name.trim(),
          type: 'adjustment',
          quantity: 0,
          notes: `Item specifications modified by ${userProfile?.name}`,
          user_id: userProfile?.id || 'unknown_user',
          created_at: new Date().toISOString()
        });

      } else {
        // --- Create Mode Insert ---
        const resolvedLocationName = locationId 
          ? (locations.find(l => l.id === locationId)?.name || 'Default Depot') 
          : 'Unassigned';

        const newItemResult = await pushData<Item>('items', {
          id: '',
          item_name: name.trim(),
          sku: finalSku,
          category,
          description: description.trim(),
          quantity: parsedQty,
          reorder_level: reorderLevelVal,
          location: resolvedLocationName,
          supplier,
          cost: costVal,
          status: statusVal,
          created_at: new Date().toISOString()
        });

        const generatedItemId = newItemResult.key || '';

        // Automatically bind initial quantity to selection location depot if selected
        if (locationId) {
          await pushData('item_locations', {
            item_id: generatedItemId,
            location_id: locationId,
            quantity: parsedQty
          });
        }

        // Register Stock Movement entry for creation
        await pushData('stock_movements', {
          item_id: generatedItemId,
          item_name: name.trim(),
          type: 'in',
          quantity: parsedQty,
          to_location: resolvedLocationName,
          notes: `Initial stock receipt check-in for new item`,
          user_id: userProfile?.id || 'unknown_user',
          created_at: new Date().toISOString()
        });
      }

      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Error occurred during save processing.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!itemId) return;
    Alert.alert('Confirm Delete', 'Are you absolutely sure you want to delete this inventory item? This transaction cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            
            // 1. Delete cascading stock movements
            const allMovements = await getData<any>('stock_movements');
            if (allMovements) {
              const promises = Object.values(allMovements)
                .filter((m: any) => m.item_id === itemId)
                .map((m: any) => deleteData(`stock_movements/${m.id}`));
              await Promise.all(promises);
            }

            // 2. Delete cascading item locations
            const allLocs = await getData<any>('item_locations');
            if (allLocs) {
              const promises = Object.values(allLocs)
                .filter((il: any) => il.item_id === itemId)
                .map((il: any) => deleteData(`item_locations/${il.id}`));
              await Promise.all(promises);
            }

            // 3. Delete the core item node
            await deleteData(`items/${itemId}`);

            navigation.navigate('InventoryList');
          } catch (e: any) {
            setError(e.message || 'Error occurred during deletion.');
            setSaving(false);
          }
        }
      }
    ]);
  };

  const getLocName = (locId: string) => {
    const loc = locations.find(l => l.id === locId);
    return loc ? loc.name : 'Choose depot...';
  };

  if (initLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Initializing specs editor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? 'Edit Specifications' : 'New Inventory Item'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isEditMode ? `Updating Code: ${sku}` : 'Add a brand new item entry'}
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Name input */}
        <TextInput
          label="Item Name (Required)"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        {/* SKU input */}
        <TextInput
          label="SKU Code (Auto-generated if empty)"
          value={sku}
          onChangeText={setSku}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. ITM-00001"
        />

        {/* Dropdown 1: Category */}
        <Text style={styles.label}>Select Category Classification (Required):</Text>
        <Button 
          mode="outlined" 
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          style={styles.pickerTrigger}
          icon="chevron-down"
          contentStyle={styles.pickerContent}
        >
          {category || 'Choose category...'}
        </Button>

        {showCategoryPicker && (
          <Surface style={styles.pickerDropdown} elevation={1}>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={styles.dropdownOption}
                onPress={() => {
                  setCategory(cat.name);
                  setShowCategoryPicker(false);
                  setError('');
                }}
              >
                <Text>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </Surface>
        )}

        {/* Cost input */}
        <TextInput
          label="Unit Cost ($)"
          value={cost}
          onChangeText={setCost}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
          placeholder="0.00"
        />

        {/* Dropdown 2: Supplier */}
        <Text style={styles.label}>Select Logistics Supplier:</Text>
        <Button 
          mode="outlined" 
          onPress={() => setShowSupplierPicker(!showSupplierPicker)}
          style={styles.pickerTrigger}
          icon="chevron-down"
          contentStyle={styles.pickerContent}
        >
          {supplier || 'Choose supplier...'}
        </Button>

        {showSupplierPicker && (
          <Surface style={styles.pickerDropdown} elevation={1}>
            {suppliers.map(sup => (
              <TouchableOpacity 
                key={sup.id} 
                style={styles.dropdownOption}
                onPress={() => {
                  setSupplier(sup.name);
                  setShowSupplierPicker(false);
                  setError('');
                }}
              >
                <Text>{sup.name}</Text>
              </TouchableOpacity>
            ))}
          </Surface>
        )}

        {/* Reorder Level input */}
        <TextInput
          label="Reorder Safety Level limit"
          value={reorderLevel}
          onChangeText={setReorderLevel}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
        />

        {/* Location Depot & Initial Quantity (locked / disabled in edit mode) */}
        {!isEditMode && (
          <>
            {/* Dropdown 3: Initial Location */}
            <Text style={styles.label}>Select Initial Depot Placement (Optional):</Text>
            <Button 
              mode="outlined" 
              onPress={() => setShowLocationPicker(!showLocationPicker)}
              style={styles.pickerTrigger}
              icon="chevron-down"
              contentStyle={styles.pickerContent}
            >
              {getLocName(locationId)}
            </Button>

            {showLocationPicker && (
              <Surface style={styles.pickerDropdown} elevation={1}>
                {locations.map(loc => (
                  <TouchableOpacity 
                    key={loc.id} 
                    style={styles.dropdownOption}
                    onPress={() => {
                      setLocationId(loc.id);
                      setShowLocationPicker(false);
                      setError('');
                    }}
                  >
                    <Text>{loc.name}</Text>
                  </TouchableOpacity>
                ))}
              </Surface>
            )}

            {/* Initial quantity input */}
            <TextInput
              label="Initial Check-in Stock Quantity"
              value={initialQty}
              onChangeText={setInitialQty}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
            />
          </>
        )}

        {/* Description multiline input */}
        <TextInput
          label="Specification Description Details"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Submit Actions */}
        <View style={styles.btnRow}>
          <Button 
            mode="outlined" 
            onPress={() => navigation.goBack()} 
            style={styles.btn}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSave} 
            style={[styles.btn, styles.saveBtn]}
            loading={saving}
            disabled={saving}
          >
            Save Record
          </Button>
        </View>

        {isEditMode && (
          <Button 
            mode="outlined" 
            onPress={handleDelete} 
            icon="delete"
            textColor="#ef4444"
            style={{ borderColor: '#ef4444', marginTop: 16, borderRadius: 4 }}
            disabled={saving}
          >
            Delete Item
          </Button>
        )}
      </View>
    </ScrollView>
  );
}

import { TouchableOpacity } from 'react-native';

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
    padding: 20,
    backgroundColor: '#1e293b',
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  label: {
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 4,
    marginBottom: 8,
    fontSize: 13,
  },
  pickerTrigger: {
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 16,
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
    maxHeight: 140,
    overflow: 'scroll',
    marginBottom: 16,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 16,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  btn: {
    flex: 1,
    marginHorizontal: 8,
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
});
