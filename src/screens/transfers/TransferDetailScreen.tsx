import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  Avatar,
  Divider,
  ActivityIndicator,
  Snackbar,
  IconButton
} from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { listenToData, updateData, pushData, getData } from '../../services/database';
import { TransferStackParamList } from '../../navigation/types';
import { StockTransfer, ItemLocation, Item } from '../../types';

type DetailRouteProp = RouteProp<TransferStackParamList, 'TransferDetail'>;

export default function TransferDetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const { transferId } = route.params;
  const { userProfile } = useAuth();

  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Loaders & Database states
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [transfer, setTransfer] = useState<StockTransfer | null>(null);

  // Snackbar Notification states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  useEffect(() => {
    // Subscribe to specific stock transfer details
    const unsub = listenToData<StockTransfer>(`stock_transfers/${transferId}`, (data) => {
      setTransfer(data);
      setLoading(false);
    });

    return () => unsub();
  }, [transferId]);

  const showNotification = (msg: string, isErr = false) => {
    setSnackbarMessage(msg);
    setSnackbarError(isErr);
    setSnackbarVisible(true);
  };

  const handleApprove = async () => {
    if (!transfer) return;
    setActioning(true);

    try {
      // 1. Update transit status to 'Approved'
      await updateData(`stock_transfers/${transferId}`, {
        status: 'Approved',
        approved_by: userProfile?.name || 'admin',
        approved_at: new Date().toISOString()
      });

      // 2. Register stock movement log
      await pushData('stock_movements', {
        item_id: transfer.item_id,
        item_name: transfer.item_name,
        type: 'transfer',
        quantity: transfer.quantity,
        from_location: transfer.from_location_name,
        to_location: transfer.to_location_name,
        notes: `Transfer approved by manager: ${userProfile?.name}`,
        user_id: userProfile?.id || 'unknown_user',
        created_at: new Date().toISOString()
      });

      showNotification('Transfer request approved successfully.');
    } catch (e: any) {
      showNotification(e.message || 'Error executing approval.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleReject = async () => {
    if (!transfer) return;
    setActioning(true);

    try {
      // 1. Update transit status to 'Rejected'
      await updateData(`stock_transfers/${transferId}`, {
        status: 'Rejected',
        rejected_by: userProfile?.name || 'admin',
        rejected_at: new Date().toISOString()
      });

      // 2. Register stock movement log
      await pushData('stock_movements', {
        item_id: transfer.item_id,
        item_name: transfer.item_name,
        type: 'transfer',
        quantity: transfer.quantity,
        from_location: transfer.from_location_name,
        to_location: transfer.to_location_name,
        notes: `Transfer rejected by manager: ${userProfile?.name}`,
        user_id: userProfile?.id || 'unknown_user',
        created_at: new Date().toISOString()
      });

      showNotification('Transfer request rejected.');
    } catch (e: any) {
      showNotification(e.message || 'Error executing rejection.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!transfer) return;
    setActioning(true);

    try {
      // 1. Fetch item locations to perform adjustments
      const itemLocs = await getData<Record<string, ItemLocation>>('item_locations');
      const itemLocsList = itemLocs ? Object.values(itemLocs) : [];

      // Find source site record
      const sourceRecord = itemLocsList.find(
        il => il.item_id === transfer.item_id && il.location_id === transfer.from_location_id
      );

      // Find target site record
      const destRecord = itemLocsList.find(
        il => il.item_id === transfer.item_id && il.location_id === transfer.to_location_id
      );

      // Deduct from Source
      if (sourceRecord) {
        const newSourceQty = Math.max(0, sourceRecord.quantity - transfer.quantity);
        await updateData(`item_locations/${sourceRecord.id}`, { quantity: newSourceQty });
      } else {
        // Fallback: create empty source if missing
        await pushData('item_locations', {
          item_id: transfer.item_id,
          location_id: transfer.from_location_id,
          quantity: 0
        });
      }

      // Add to Destination
      if (destRecord) {
        const newDestQty = destRecord.quantity + transfer.quantity;
        await updateData(`item_locations/${destRecord.id}`, { quantity: newDestQty });
      } else {
        await pushData('item_locations', {
          item_id: transfer.item_id,
          location_id: transfer.to_location_id,
          quantity: transfer.quantity
        });
      }

      // 2. Sum overall item quantity across all locations & update core Item node
      const freshItemLocs = await getData<Record<string, ItemLocation>>('item_locations');
      let totalQty = 0;
      if (freshItemLocs) {
        Object.values(freshItemLocs).forEach(il => {
          if (il.item_id === transfer.item_id) {
            totalQty += il.quantity;
          }
        });
      }

      const coreItem = await getData<Item>(`items/${transfer.item_id}`);
      if (coreItem) {
        let statusVal: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (totalQty <= 0) {
          statusVal = 'Out of Stock';
        } else if (totalQty <= coreItem.reorder_level) {
          statusVal = 'Low Stock';
        }
        await updateData(`items/${transfer.item_id}`, {
          quantity: totalQty,
          status: statusVal
        });
      }

      // 3. Complete Transfer Node
      await updateData(`stock_transfers/${transferId}`, {
        status: 'Completed',
        received_by: userProfile?.name || 'recipient',
        received_at: new Date().toISOString()
      });

      // 4. Log completion stock movement
      await pushData('stock_movements', {
        item_id: transfer.item_id,
        item_name: transfer.item_name,
        type: 'transfer',
        quantity: transfer.quantity,
        from_location: transfer.from_location_name,
        to_location: transfer.to_location_name,
        notes: `Transfer completed. Receipt confirmed by: ${userProfile?.name}`,
        user_id: userProfile?.id || 'unknown_user',
        created_at: new Date().toISOString()
      });

      showNotification('Stock transfer successfully completed.');
    } catch (e: any) {
      showNotification(e.message || 'Error processing completion.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleRejectReceipt = async () => {
    if (!transfer) return;
    setActioning(true);

    try {
      // 1. Update transfer status
      await updateData(`stock_transfers/${transferId}`, {
        status: 'Receipt Rejected',
        received_by: userProfile?.name || 'recipient',
        received_at: new Date().toISOString()
      });

      // 2. Log receipt rejection stock movement
      await pushData('stock_movements', {
        item_id: transfer.item_id,
        item_name: transfer.item_name,
        type: 'transfer',
        quantity: transfer.quantity,
        from_location: transfer.from_location_name,
        to_location: transfer.to_location_name,
        notes: `Receipt REJECTED by recipient: ${userProfile?.name}`,
        user_id: userProfile?.id || 'unknown_user',
        created_at: new Date().toISOString()
      });

      showNotification('Transfer receipt rejected.');
    } catch (e: any) {
      showNotification(e.message || 'Error processing receipt rejection.', true);
    } finally {
      setActioning(false);
    }
  };

  if (loading || !transfer) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching transit metrics...</Text>
      </View>
    );
  }

  // Get status color matching list style
  const statusColors: Record<string, string> = {
    Pending: '#f59e0b',
    Approved: '#2196F3',
    Completed: '#10b981',
    Rejected: '#ef4444',
    'Receipt Rejected': '#ef4444'
  };
  const badgeColor = statusColors[transfer.status] || '#64748b';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Header Surface Banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Avatar.Icon size={54} icon="truck-fast" style={styles.avatarIcon} color="#ffffff" />
        <View style={styles.headerText}>
          <Text variant="headlineSmall" style={styles.itemTitleText}>{transfer.item_name}</Text>
          <Text variant="bodyMedium" style={styles.transferIdText}>Request ID: {transfer.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.statusText}>{transfer.status}</Text>
          </View>
        </View>
      </Surface>

      <View style={styles.content}>
        {/* 2. Specs detail Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Transit Specs</Text>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Transfer Quantity</Text>
              <Text variant="titleMedium" style={[styles.specValue, { color: badgeColor, fontWeight: 'bold' }]}>
                {transfer.quantity} units
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Source Depot</Text>
              <Text style={styles.specValue}>{transfer.from_location_name}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Destination Depot</Text>
              <Text style={styles.specValue}>{transfer.to_location_name}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Initiated By</Text>
              <Text style={styles.specValue}>User: {transfer.requested_by}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>Date Created</Text>
              <Text style={styles.specValue}>
                {new Date(transfer.created_at).toLocaleString()}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* 3. Status Transition Action Buttons */}
        {transfer.status === 'Pending' && isAdminOrManager && (
          <View style={styles.actionsPanel}>
            <Text style={styles.panelTitle}>Managerial Decision Authorization Required</Text>
            <View style={styles.actionsRow}>
              <Button
                mode="outlined"
                onPress={handleReject}
                icon="close"
                style={styles.actionBtn}
                labelStyle={{ color: '#ef4444' }}
                disabled={actioning}
              >
                Reject Request
              </Button>
              <Button
                mode="contained"
                onPress={handleApprove}
                icon="check"
                style={[styles.actionBtn, styles.approveBtn]}
                disabled={actioning}
                loading={actioning}
              >
                Approve
              </Button>
            </View>
          </View>
        )}

        {transfer.status === 'Approved' && (
          <View style={styles.actionsPanel}>
            <Text style={styles.panelTitle}>Destination Receipt Confirmation</Text>
            <View style={styles.actionsRow}>
              <Button
                mode="outlined"
                onPress={handleRejectReceipt}
                icon="alert-circle"
                style={styles.actionBtn}
                labelStyle={{ color: '#ef4444' }}
                disabled={actioning}
              >
                Reject Receipt
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmReceipt}
                icon="check-double"
                style={[styles.actionBtn, styles.completeBtn]}
                disabled={actioning}
                loading={actioning}
              >
                Confirm Receipt
              </Button>
            </View>
          </View>
        )}

        {/* 4. Audit Timeline History */}
        <Text variant="titleMedium" style={styles.sectionHeader}>Audit Trail History</Text>
        <Card style={styles.timelineCard}>
          <Card.Content>
            {/* Step 1: Created */}
            <View style={styles.timelineItem}>
              <IconButton icon="plus-circle" size={20} iconColor="#10b981" style={styles.timelineIcon} />
              <View style={styles.timelineText}>
                <Text style={styles.timelineTitle}>Transfer Requested</Text>
                <Text variant="bodySmall" style={styles.timelineSub}>
                  Submitted by {transfer.requested_by} on {new Date(transfer.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Step 2: Approval Phase */}
            {transfer.approved_by || transfer.rejected_by ? (
              <>
                <Divider style={styles.timelineDivider} />
                <View style={styles.timelineItem}>
                  <IconButton
                    icon={transfer.approved_by ? "check-circle" : "close-circle"}
                    size={20}
                    iconColor={transfer.approved_by ? "#2196F3" : "#ef4444"}
                    style={styles.timelineIcon}
                  />
                  <View style={styles.timelineText}>
                    <Text style={styles.timelineTitle}>
                      {transfer.approved_by ? 'Approved by Admin' : 'Rejected by Admin'}
                    </Text>
                    <Text variant="bodySmall" style={styles.timelineSub}>
                      Reviewed by {transfer.approved_by || transfer.rejected_by} on {
                        new Date(transfer.approved_at || transfer.rejected_at || '').toLocaleDateString()
                      }
                    </Text>
                  </View>
                </View>
              </>
            ) : null}

            {/* Step 3: Receipt Phase */}
            {transfer.status === 'Completed' || transfer.status === 'Receipt Rejected' ? (
              <>
                <Divider style={styles.timelineDivider} />
                <View style={styles.timelineItem}>
                  <IconButton
                    icon={transfer.status === 'Completed' ? "check-decagram" : "alert-decagram"}
                    size={20}
                    iconColor={transfer.status === 'Completed' ? "#10b981" : "#ef4444"}
                    style={styles.timelineIcon}
                  />
                  <View style={styles.timelineText}>
                    <Text style={styles.timelineTitle}>
                      {transfer.status === 'Completed' ? 'Receipt Confirmed' : 'Receipt Rejected'}
                    </Text>
                    <Text variant="bodySmall" style={styles.timelineSub}>
                      Logged by {transfer.received_by || 'recipient'} on {
                        new Date(transfer.received_at || '').toLocaleDateString()
                      }
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
          </Card.Content>
        </Card>
      </View>

      {/* Snackbar Alert */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3500}
        style={{ backgroundColor: snackbarError ? '#ef4444' : '#10b981' }}
      >
        {snackbarMessage}
      </Snackbar>
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
  headerText: {
    flex: 1,
  },
  itemTitleText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  transferIdText: {
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
    alignItems: 'center',
  },
  specLabel: {
    fontWeight: 'bold',
    color: '#64748b',
  },
  specValue: {
    color: '#0f172a',
  },
  divider: {
    backgroundColor: '#f1f5f9',
  },
  actionsPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    elevation: 1,
  },
  panelTitle: {
    fontWeight: 'bold',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    marginHorizontal: 6,
  },
  approveBtn: {
    backgroundColor: '#2196F3',
  },
  completeBtn: {
    backgroundColor: '#10b981',
  },
  sectionHeader: {
    color: '#475569',
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 15,
  },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineIcon: {
    margin: 0,
    marginRight: 10,
  },
  timelineText: {
    flex: 1,
  },
  timelineTitle: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  timelineSub: {
    color: '#64748b',
    marginTop: 2,
  },
  timelineDivider: {
    marginVertical: 8,
    marginLeft: 32,
    backgroundColor: '#f1f5f9',
  },
});
