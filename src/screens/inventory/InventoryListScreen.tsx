import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { 
  Text, 
  Card, 
  Searchbar, 
  FAB, 
  Chip, 
  Badge, 
  ActivityIndicator,
  IconButton
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { usePermissions } from '../../hooks/usePermissions';
import { listenToData } from '../../services/database';
import { InventoryStackParamList } from '../../navigation/types';
import { Item, Category } from '../../types';

type NavigationProp = StackNavigationProp<InventoryStackParamList, 'InventoryList'>;

export default function InventoryListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { can } = usePermissions();
  const canCreate = can('items.create');

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  
  // Filtering States
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // 1. Subscribe to items
    const unsubItems = listenToData<Record<string, Item>>('items', (data) => {
      if (data) {
        setItems(
          Object.entries(data).map(([key, val]) => ({
            id: val.id || key,
            ...val
          }))
        );
      } else {
        setItems([]);
      }
      setLoading(false);
    });

    // 2. Subscribe to categories
    const unsubCategories = listenToData<Record<string, Category>>('categories', (data) => {
      if (data) {
        setCategories(Object.values(data));
      } else {
        setCategories([]);
      }
    });

    return () => {
      unsubItems();
      unsubCategories();
    };
  }, []);

  // Filter items in memory
  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    const matchesCategory = !selectedCategory || item.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string | undefined, qty: number) => {
    if (qty <= 0 || status === 'Out of Stock') return '#ef4444'; // Red
    if (status === 'Low Stock') return '#f59e0b'; // Amber
    return '#10b981'; // Green
  };

  const renderItemCard = ({ item }: { item: Item }) => {
    const statusColor = getStatusColor(item.status, item.quantity);
    
    return (
      <Card 
        style={styles.card}
        onPress={() => navigation.navigate('InventoryDetail', { itemId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleCol}>
              <Text variant="titleMedium" style={styles.itemTitle}>{item.item_name}</Text>
              <Text variant="bodySmall" style={styles.skuText}>SKU: {item.sku}</Text>
            </View>
            <Badge 
              style={[styles.statusBadge, { backgroundColor: statusColor }]}
              size={22}
            >
              {item.status || (item.quantity > 0 ? 'In Stock' : 'Out of Stock')}
            </Badge>
          </View>
          
          <View style={styles.cardFooter}>
            <Text variant="bodyMedium" style={styles.categoryLabel}>
              Category: <Text style={styles.categoryValue}>{item.category}</Text>
            </Text>
            <Text variant="headlineSmall" style={[styles.qtyText, { color: statusColor }]}>
              {item.quantity} <Text style={styles.unitText}>pcs</Text>
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
        <Text style={styles.loadingText}>Loading Inventory Ledger...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and toggle filters row */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search by name or SKU..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
        <IconButton 
          icon={showFilters ? "filter-remove" : "filter-variant"} 
          mode={showFilters ? "contained" : "outlined"}
          iconColor="#2196F3"
          size={24}
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterBtn}
        />
      </View>

      {/* Expandable filters box */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterGroupTitle}>Filter by Status:</Text>
          <View style={styles.chipRow}>
            {['In Stock', 'Low Stock', 'Out of Stock'].map((status) => (
              <Chip
                key={status}
                selected={selectedStatus === status}
                onPress={() => setSelectedStatus(selectedStatus === status ? null : status)}
                style={styles.chip}
                selectedColor="#2196F3"
              >
                {status}
              </Chip>
            ))}
          </View>

          {categories.length > 0 && (
            <>
              <Text style={styles.filterGroupTitle}>Filter by Category:</Text>
              <View style={styles.chipRow}>
                {categories.map((cat) => (
                  <Chip
                    key={cat.id}
                    selected={selectedCategory === cat.name}
                    onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                    style={styles.chip}
                    selectedColor="#2196F3"
                  >
                    {cat.name}
                  </Chip>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {/* FlatList for Inventory Items */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            No inventory items match your search.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItemCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB to create item (Admin & Managers only) */}
      {canCreate && (
        <FAB
          icon="plus"
          label="New Item"
          style={styles.fab}
          onPress={() => navigation.navigate('InventoryCreateEdit', {})}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchbar: {
    flex: 1,
    backgroundColor: '#ffffff',
    elevation: 2,
    borderRadius: 8,
  },
  searchInput: {
    fontSize: 14,
  },
  filterBtn: {
    marginLeft: 8,
    marginRight: 0,
    backgroundColor: '#ffffff',
  },
  filtersContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterGroupTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: '#f1f5f9',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  skuText: {
    color: '#64748b',
    marginTop: 2,
  },
  statusBadge: {
    color: '#ffffff',
    fontWeight: 'bold',
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  categoryLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  categoryValue: {
    color: '#0f172a',
    fontWeight: '500',
  },
  qtyText: {
    fontWeight: 'bold',
  },
  unitText: {
    fontSize: 12,
    fontWeight: 'normal',
    color: '#64748b',
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
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#2196F3',
  },
});
