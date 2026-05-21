import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  ActivityIndicator,
  Portal,
  Dialog
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { getData, pushData } from '../../services/database';
import { TransferStackParamList } from '../../navigation/types';
import { Item, Location, ItemLocation } from '../../types';

type NavigationProp = StackNavigationProp<TransferStackParamList, 'TransferCreate'>;

export default function TransferCreateScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Database Resources
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);

  // Selected Form values
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fromLocId, setFromLocId] = useState('');
  const [toLocId, setToLocId] = useState('');

  // Dropdown Picker Dialog controls
  const [pickerType, setPickerType] = useState<'item' | 'from' | 'to' | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  // Available live stock count
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  // Feedback error
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResources = async () => {
      try {
        const [itemsData, locsData, itemLocsData] = await Promise.all([
          getData<Record<string, Item>>('items'),
          getData<Record<string, Location>>('locations'),
          getData<Record<string, ItemLocation>>('item_locations')
        ]);

        const itemsList = itemsData
          ? Object.keys(itemsData).map(key => ({
              id: itemsData[key].id || key,
              ...itemsData[key]
            }))
          : [];
        setItems(itemsList);

        const locationsList = locsData
          ? Object.keys(locsData).map(key => ({
              id: locsData[key].id || key,
              ...locsData[key]
            }))
          : [];
        setLocations(locationsList);

        const itemLocationsList = itemLocsData
          ? Object.keys(itemLocsData).map(key => ({
              id: itemLocsData[key].id || key,
              ...itemLocsData[key]
            }))
          : [];
        setItemLocations(itemLocationsList);
      } catch (e: any) {
        setError(e.message || 'Error occurred while loading form lists.');
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, []);

  // Recalculate available stock at selected source site
  useEffect(() => {
    if (selectedItemId && fromLocId) {
      const sourceLoc = locations.find(l => l.id === fromLocId || l.name === fromLocId);
      const locId = sourceLoc ? sourceLoc.id : fromLocId;
      const match = itemLocations.find(
        il => il.item_id === selectedItemId && il.location_id === locId
      );
      setAvailableStock(match ? match.quantity : 0);
    } else {
      setAvailableStock(null);
    }
  }, [selectedItemId, fromLocId, itemLocations, locations]);

  const openPicker = (type: 'item' | 'from' | 'to') => {
    setPickerType(type);
    setDialogVisible(true);
  };

  const selectOption = (id: string) => {
    setError('');
    if (pickerType === 'item') {
      setSelectedItemId(id);
    } else if (pickerType === 'from') {
      setFromLocId(id);
    } else if (pickerType === 'to') {
      setToLocId(id);
    }
    setDialogVisible(false);
  };

  const getSelectedLabel = (type: 'item' | 'from' | 'to') => {
    if (type === 'item') {
      const item = items.find(i => i.id === selectedItemId);
      return item ? `${item.item_name} (SKU: ${item.sku})` : 'Choose inventory item...';
    } else {
      const locId = type === 'from' ? fromLocId : toLocId;
      const loc = locations.find(l => l.id === locId || l.name === locId);
      return loc ? loc.name : 'Choose depot...';
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!selectedItemId) {
      setError('Please select an inventory item.');
      return;
    }
    if (!fromLocId || !toLocId) {
      setError('Please select both source and destination depots.');
      return;
    }
    if (fromLocId === toLocId) {
      setError('Source and Destination depots cannot be the same.');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please input a valid transfer quantity greater than 0.');
      return;
    }

    if (availableStock !== null && qty > availableStock) {
      setError(`Insufficient stock at selected depot. Available stock: ${availableStock} units.`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const chosenItem = items.find(i => i.id === selectedItemId)!;
      const sourceLoc = locations.find(l => l.id === fromLocId || l.name === fromLocId)!;
      const destLoc = locations.find(l => l.id === toLocId || l.name === toLocId)!;

      const resolvedFromId = sourceLoc ? sourceLoc.id : fromLocId;
      const resolvedToId = destLoc ? destLoc.id : toLocId;

      // 1. Create stock transfer record in Firebase Realtime Database
      await pushData('stock_transfers', {
        id: '', // Will be generated
        item_id: selectedItemId,
        item_name: chosenItem.item_name,
        quantity: qty,
        from_location_id: resolvedFromId,
        from_location_name: sourceLoc.name,
        to_location_id: resolvedToId,
        to_location_name: destLoc.name,
        status: 'Pending',
        requested_by: userProfile?.name || 'unknown_user',
        created_at: new Date().toISOString()
      });

      // 2. Add an audit entry to stock movements
      await pushData('stock_movements', {
        item_id: selectedItemId,
        item_name: chosenItem.item_name,
        type: 'transfer',
        quantity: qty,
        from_location: sourceLoc.name,
        to_location: destLoc.name,
        notes: `Transfer request created by ${userProfile?.name}`,
        user_id: userProfile?.id || 'unknown_user',
        created_at: new Date().toISOString()
      });

      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Error executing transfer transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching database catalog...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>Request Stock Transit</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Create a new inter-depot inventory relocation request
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Item Selector */}
        <Text style={styles.inputLabel}>Select Item:</Text>
        <Button 
          mode="outlined" 
          onPress={() => openPicker('item')}
          style={styles.pickerTrigger}
          icon="chevron-down"
          contentStyle={styles.pickerContent}
        >
          {getSelectedLabel('item')}
        </Button>

        {/* Source site */}
        <Text style={styles.inputLabel}>From Source Depot:</Text>
        <Button 
          mode="outlined" 
          onPress={() => openPicker('from')}
          style={styles.pickerTrigger}
          icon="chevron-down"
          contentStyle={styles.pickerContent}
        >
          {getSelectedLabel('from')}
        </Button>

        {/* Destination site */}
        <Text style={styles.inputLabel}>To Destination Depot:</Text>
        <Button 
          mode="outlined" 
          onPress={() => openPicker('to')}
          style={styles.pickerTrigger}
          icon="chevron-down"
          contentStyle={styles.pickerContent}
        >
          {getSelectedLabel('to')}
        </Button>

        {/* Quantity available indicators */}
        {availableStock !== null && (
          <Surface style={styles.stockStatusSurface} elevation={0}>
            <Text style={styles.stockStatusTitle}>Depot Inventory Status:</Text>
            <Text style={styles.stockStatusVal}>
              Available stock at source depot: <Text style={styles.stockQty}>{availableStock}</Text> pcs
            </Text>
          </Surface>
        )}

        {/* Quantity Input */}
        <TextInput
          label="Transfer Quantity"
          value={quantity}
          onChangeText={(val) => {
            setQuantity(val);
            setError('');
          }}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 50"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Actions Button Panel */}
        <View style={styles.btnRow}>
          <Button 
            mode="outlined" 
            onPress={() => navigation.goBack()} 
            style={styles.btn}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            mode="contained" 
            onPress={handleSubmit} 
            style={[styles.btn, styles.submitBtn]}
            loading={submitting}
            disabled={submitting}
          >
            Submit Request
          </Button>
        </View>
      </View>

      {/* Dynamic Popups for Picker dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            {pickerType === 'item' ? 'Choose Inventory Item' : 'Choose Warehouse Depot'}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerType === 'item' && items.map(item => (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.dropdownOption}
                  onPress={() => selectOption(item.id)}
                >
                  <Text style={styles.optionText}>{item.item_name}</Text>
                  <Text variant="bodySmall" style={styles.optionSub}>SKU: {item.sku} • Current total: {item.quantity} pcs</Text>
                </TouchableOpacity>
              ))}

              {pickerType !== 'item' && locations.map(loc => (
                <TouchableOpacity 
                  key={loc.id || loc.name} 
                  style={styles.dropdownOption}
                  onPress={() => selectOption(loc.id || loc.name)}
                >
                  <Text style={styles.optionText}>{loc.name}</Text>
                  {loc.description ? (
                    <Text variant="bodySmall" style={styles.optionSub}>{loc.description}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
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
  inputLabel: {
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
  },
  pickerTrigger: {
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  pickerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  stockStatusSurface: {
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
  },
  stockStatusTitle: {
    fontWeight: 'bold',
    color: '#1e3a8a',
    fontSize: 12,
  },
  stockStatusVal: {
    color: '#1d4ed8',
    marginTop: 2,
    fontSize: 13,
  },
  stockQty: {
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
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
  submitBtn: {
    backgroundColor: '#2196F3',
  },
  dialog: {
    backgroundColor: '#ffffff',
    maxHeight: '75%',
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  dialogScroll: {
    paddingHorizontal: 0,
  },
  dropdownOption: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  optionSub: {
    color: '#64748b',
    marginTop: 2,
  },
});
