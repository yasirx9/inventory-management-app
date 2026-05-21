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
import { Supplier } from '../../types';

type NavigationProp = StackNavigationProp<MoreStackParamList, 'Suppliers'>;

export default function SupplierListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userProfile } = useAuth();
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Snackbar Alert States
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  // Delete Dialog States
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Subscribe to suppliers database node
    const unsubSuppliers = listenToData<Record<string, Supplier>>('suppliers', (data) => {
      setSuppliers(data ? Object.values(data) : []);
      setLoading(false);
    });

    return () => unsubSuppliers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const triggerDeleteConfirm = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogVisible(true);
  };

  const handleDeleteExecute = async () => {
    if (!selectedSupplier) return;
    setDeleting(true);

    try {
      await deleteData(`suppliers/${selectedSupplier.id}`);
      setDeleteDialogVisible(false);
      setSnackbarMessage(`Supplier "${selectedSupplier.name}" successfully deleted.`);
      setSnackbarError(false);
      setSnackbarVisible(true);
    } catch (e: any) {
      setSnackbarMessage(e.message || 'Error occurred during deletion.');
      setSnackbarError(true);
      setSnackbarVisible(true);
    } finally {
      setDeleting(false);
      setSelectedSupplier(null);
    }
  };

  const renderSupplierCard = ({ item }: { item: Supplier }) => {
    return (
      <Card 
        style={styles.card}
        onLongPress={() => isAdminOrManager && navigation.navigate('SupplierForm', { supplierId: item.id })}
      >
        <Card.Content style={styles.cardContent}>
          <View style={styles.infoCol}>
            <Text variant="titleMedium" style={styles.supName}>{item.name}</Text>
            
            {item.contact_person ? (
              <View style={styles.detailRow}>
                <IconButton icon="account-tie" size={16} iconColor="#64748b" style={styles.rowIcon} />
                <Text variant="bodyMedium" style={styles.detailText}>{item.contact_person}</Text>
              </View>
            ) : null}

            {item.phone ? (
              <View style={styles.detailRow}>
                <IconButton icon="phone" size={16} iconColor="#64748b" style={styles.rowIcon} />
                <Text variant="bodyMedium" style={styles.detailText}>{item.phone}</Text>
              </View>
            ) : null}

            {item.email ? (
              <View style={styles.detailRow}>
                <IconButton icon="email" size={16} iconColor="#64748b" style={styles.rowIcon} />
                <Text variant="bodyMedium" style={styles.detailText}>{item.email}</Text>
              </View>
            ) : null}
          </View>
          
          {isAdminOrManager && (
            <View style={styles.actionsCol}>
              <IconButton 
                icon="pencil-outline" 
                size={20} 
                iconColor="#2196F3"
                onPress={() => navigation.navigate('SupplierForm', { supplierId: item.id })}
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
        <Text style={styles.loadingText}>Fetching system suppliers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Banner */}
      <View style={styles.headerBanner}>
        <Text variant="bodyMedium" style={styles.bannerText}>
          Maintain logistical partners and suppliers. Long-press any card or tap action buttons to modify profiles.
        </Text>
      </View>

      {suppliers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconButton icon="truck-delivery" size={60} iconColor="#cbd5e1" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No logistics suppliers listed.
          </Text>
          {isAdminOrManager && (
            <Button 
              mode="contained" 
              style={styles.emptyBtn} 
              onPress={() => navigation.navigate('SupplierForm', {})}
            >
              Add Supplier
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={suppliers}
          renderItem={renderSupplierCard}
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
          label="New Supplier"
          style={styles.fab}
          onPress={() => navigation.navigate('SupplierForm', {})}
        />
      )}

      {/* Action Snackbar Notification */}
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
              Are you sure you want to permanently delete supplier "{selectedSupplier?.name}"? This action is irreversible.
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
    paddingVertical: 10,
  },
  infoCol: {
    flex: 1,
  },
  supName: {
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
    paddingLeft: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: -6,
  },
  rowIcon: {
    margin: 0,
  },
  detailText: {
    color: '#475569',
    marginLeft: 2,
    fontSize: 13,
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
