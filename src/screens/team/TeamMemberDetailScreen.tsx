import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Surface, 
  Avatar, 
  Divider, 
  ActivityIndicator, 
  Snackbar,
  Portal,
  Dialog,
  TextInput,
  IconButton,
  Badge
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { listenToData, deleteData, updateData, pushData } from '../../services/database';
import { MoreStackParamList } from '../../navigation/types';
import { TeamMember } from '../../types';

type DetailRouteProp = RouteProp<MoreStackParamList, 'TeamMemberDetail'>;
type NavigationProp = StackNavigationProp<MoreStackParamList, 'TeamMemberDetail'>;

interface SupplementaryDoc {
  id: string;
  member_id: string;
  doc_type: string;
  doc_number: string;
  expiry_date: string;
  notes?: string;
}

export default function TeamMemberDetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { memberId } = route.params;
  const { userProfile } = useAuth();
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // State Loaders & data stores
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [suppDocs, setSuppDocs] = useState<SupplementaryDoc[]>([]);

  // Modals for supplementary documents
  const [addDocVisible, setAddDocVisible] = useState(false);
  const [newDocType, setNewDocType] = useState('');
  const [newDocNum, setNewDocNum] = useState('');
  const [newDocExpiry, setNewDocExpiry] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');

  // Snackbar Notification states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  useEffect(() => {
    // 1. Subscribe to Team Member details
    const unsub = listenToData<TeamMember>(`team_members/${memberId}`, (data) => {
      setMember(data);
      setLoading(false);
    });

    // 2. Subscribe to Supplementary Documents
    const unsubDocs = listenToData<Record<string, SupplementaryDoc>>('team_member_documents', (data) => {
      if (data) {
        setSuppDocs(Object.values(data).filter(d => d.member_id === memberId));
      } else {
        setSuppDocs([]);
      }
    });

    return () => {
      unsub();
      unsubDocs();
    };
  }, [memberId]);

  const showNotification = (msg: string, isErr = false) => {
    setSnackbarMessage(msg);
    setSnackbarError(isErr);
    setSnackbarVisible(true);
  };

  const getDaysRemaining = (expiryDate?: string) => {
    if (!expiryDate) return Infinity;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryStyle = (expiryDate?: string) => {
    const days = getDaysRemaining(expiryDate);
    if (days <= 0) {
      return { 
        color: '#7f1d1d', // Dark Red
        bg: '#fee2e2', 
        label: 'EXPIRED',
        iconColor: '#7f1d1d'
      };
    } else if (days < 30) {
      return { 
        color: '#ef4444', // Light Red
        bg: '#fef2f2', 
        label: `${days} Days Left (Urgent Alert!)`,
        iconColor: '#ef4444'
      };
    } else if (days <= 60) {
      return { 
        color: '#d97706', // Yellow/Amber
        bg: '#fffbeb', 
        label: `${days} Days Left (Warning)`,
        iconColor: '#d97706'
      };
    } else {
      return { 
        color: '#10b981', // Green
        bg: '#ecfdf5', 
        label: `${days} Days Left (Safe)`,
        iconColor: '#10b981'
      };
    }
  };

  const handleDeleteMember = () => {
    Alert.alert('Confirm Delete', 'Are you absolutely sure you want to delete this staff member? This transaction cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete member node
            await deleteData(`team_members/${memberId}`);
            
            // Delete cascading supplementary documents
            const allDocs = await getData<Record<string, SupplementaryDoc>>('team_member_documents');
            if (allDocs) {
              const promises = Object.values(allDocs)
                .filter(d => d.member_id === memberId)
                .map(d => deleteData(`team_member_documents/${d.id}`));
              await Promise.all(promises);
            }

            navigation.goBack();
          } catch (e: any) {
            showNotification(e.message || 'Error occurred.', true);
          }
        }
      }
    ]);
  };

  const handleAddSuppDoc = async () => {
    if (!newDocType.trim() || !newDocNum.trim() || !newDocExpiry.trim()) {
      showNotification('Document Type, Number, and Expiry are required.', true);
      return;
    }
    setActioning(true);

    try {
      await pushData('team_member_documents', {
        id: '',
        member_id: memberId,
        doc_type: newDocType.trim(),
        doc_number: newDocNum.trim(),
        expiry_date: newDocExpiry.trim(),
        notes: newDocNotes.trim()
      });

      setAddDocVisible(false);
      setNewDocType('');
      setNewDocNum('');
      setNewDocExpiry('');
      setNewDocNotes('');
      showNotification('Supplementary document uploaded.');
    } catch (e: any) {
      showNotification(e.message || 'Error occurred.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleDeleteSuppDoc = (docId: string) => {
    Alert.alert('Confirm Delete', 'Delete this supplementary document record?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteData(`team_member_documents/${docId}`);
            showNotification('Document deleted successfully.');
          } catch (e: any) {
            showNotification(e.message || 'Error occurred.', true);
          }
        }
      }
    ]);
  };

  if (loading || !member) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching staff dossier...</Text>
      </View>
    );
  }

  // Calculate colors for Iqama and Passport expiries
  const iqamaExpiryStyle = getExpiryStyle(member.iqama_expiry);
  const passportExpiryStyle = getExpiryStyle(member.passport_expiry);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Profile Hero Section */}
      <Surface style={styles.heroSection} elevation={1}>
        <Avatar.Text 
          size={72} 
          label={member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()} 
          style={styles.avatar} 
          color="#ffffff"
        />
        <Text variant="headlineSmall" style={styles.nameText}>{member.name}</Text>
        <Text variant="bodyMedium" style={styles.roleText}>{member.role} • {member.department}</Text>
        <Badge style={[styles.statusBadge, { backgroundColor: member.status === 'active' ? '#10b981' : '#64748b' }]}>
          {member.status.toUpperCase()}
        </Badge>
      </Surface>

      <View style={styles.content}>
        {/* 2. Personal Info Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Personal Information</Text>
            
            <View style={styles.infoRow}>
              <IconButton icon="email" size={20} iconColor="#2196F3" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoVal}>{member.email || 'N/A'}</Text>
              </View>
            </View>

            <Divider />

            <View style={styles.infoRow}>
              <IconButton icon="phone" size={20} iconColor="#2196F3" style={styles.infoIcon} />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Mobile Number</Text>
                <Text style={styles.infoVal}>{member.phone || 'N/A'}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* 3. Document Expiry Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>Primary Legal Documents</Text>

            {/* CNIC */}
            <View style={styles.documentItem}>
              <View style={styles.docHeader}>
                <Text variant="titleMedium" style={styles.docTitle}>CNIC Card Details</Text>
                <Badge style={[styles.daysBadge, { backgroundColor: iqamaExpiryStyle.bg, color: iqamaExpiryStyle.color }]}>
                  {iqamaExpiryStyle.label}
                </Badge>
              </View>
              <Text style={styles.docText}>ID Number: {member.iqama_number || 'Not Registered'}</Text>
              {member.iqama_expiry ? (
                <Text style={styles.docText}>Expiry Date: {new Date(member.iqama_expiry).toLocaleDateString()}</Text>
              ) : null}
            </View>

            <Divider style={styles.docDivider} />

            {/* Passport */}
            <View style={styles.documentItem}>
              <View style={styles.docHeader}>
                <Text variant="titleMedium" style={styles.docTitle}>Passport Details</Text>
                <Badge style={[styles.daysBadge, { backgroundColor: passportExpiryStyle.bg, color: passportExpiryStyle.color }]}>
                  {passportExpiryStyle.label}
                </Badge>
              </View>
              <Text style={styles.docText}>Passport Number: {member.passport_number || 'Not Registered'}</Text>
              {member.passport_expiry ? (
                <Text style={styles.docText}>Expiry Date: {new Date(member.passport_expiry).toLocaleDateString()}</Text>
              ) : null}
            </View>
          </Card.Content>
        </Card>

        {/* 4. Supplementary Documents Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.docSectionHeaderRow}>
              <Text variant="titleMedium" style={styles.cardTitle}>Supplementary Documents</Text>
              {isAdminOrManager && (
                <Button mode="outlined" size="small" onPress={() => setAddDocVisible(true)} icon="plus">
                  Add Doc
                </Button>
              )}
            </View>

            {suppDocs.length === 0 ? (
              <Text style={styles.emptyText}>No supplementary documents uploaded for this member.</Text>
            ) : (
              suppDocs.map(doc => {
                const docExpiryStyle = getExpiryStyle(doc.expiry_date);
                return (
                  <View style={styles.suppDocItem} key={doc.id}>
                    <View style={styles.suppDocHeader}>
                      <View style={styles.suppDocInfo}>
                        <Text variant="titleMedium" style={styles.suppDocType}>{doc.doc_type}</Text>
                        <Text style={styles.docText}>Number: {doc.doc_number}</Text>
                        <Text style={styles.docText}>Expiry: {new Date(doc.expiry_date).toLocaleDateString()}</Text>
                        {doc.notes ? <Text variant="bodySmall" style={styles.docNotes}>Notes: {doc.notes}</Text> : null}
                      </View>
                      
                      <View style={styles.suppDocActions}>
                        <Badge style={[styles.daysBadge, { backgroundColor: docExpiryStyle.bg, color: docExpiryStyle.color, alignSelf: 'flex-end', marginBottom: 8 }]}>
                          {docExpiryStyle.label}
                        </Badge>
                        {isAdminOrManager && (
                          <IconButton icon="trash-can-outline" iconColor="#ef4444" size={20} style={styles.trashIcon} onPress={() => handleDeleteSuppDoc(doc.id)} />
                        )}
                      </View>
                    </View>
                    <Divider style={styles.docDivider} />
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {/* 5. Authorizing Action Controls */}
        {isAdminOrManager && (
          <View style={styles.actionRowBtn}>
            <Button 
              mode="outlined" 
              style={[styles.btn, styles.deleteBtn]} 
              onPress={handleDeleteMember}
              icon="delete"
              labelStyle={{ color: '#ef4444' }}
            >
              Delete Dossier
            </Button>
            <Button 
              mode="contained" 
              style={[styles.btn, styles.editBtn]} 
              onPress={() => navigation.navigate('TeamMemberForm', { memberId })}
              icon="pencil"
            >
              Edit Specs
            </Button>
          </View>
        )}
      </View>

      {/* Add supplementary document modal dialog */}
      <Portal>
        <Dialog visible={addDocVisible} onDismiss={() => setAddDocVisible(false)}>
          <Dialog.Title>Add Supplementary Legal Document</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Document Type (e.g., Driver's License)" value={newDocType} onChangeText={setNewDocType} mode="outlined" style={styles.modalInput} />
            <TextInput label="Document Number" value={newDocNum} onChangeText={setNewDocNum} mode="outlined" style={styles.modalInput} />
            <TextInput label="Expiry Date (YYYY-MM-DD)" value={newDocExpiry} onChangeText={setNewDocExpiry} mode="outlined" placeholder="e.g. 2027-04-15" style={styles.modalInput} />
            <TextInput label="Explanatory Notes" value={newDocNotes} onChangeText={setNewDocNotes} mode="outlined" multiline numberOfLines={3} style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDocVisible(false)}>Cancel</Button>
            <Button onPress={handleAddSuppDoc} loading={actioning} disabled={actioning}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Alert Notifications */}
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
  heroSection: {
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  avatar: {
    backgroundColor: '#2196F3',
    marginBottom: 12,
  },
  nameText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  roleText: {
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 1,
    marginBottom: 16,
  },
  cardTitle: {
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoIcon: {
    margin: 0,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#64748b',
    fontSize: 12,
  },
  infoVal: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  documentItem: {
    paddingVertical: 8,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  docTitle: {
    fontWeight: 'bold',
    color: '#334155',
  },
  docText: {
    color: '#475569',
    marginTop: 2,
    fontSize: 13,
  },
  daysBadge: {
    fontWeight: 'bold',
  },
  docDivider: {
    marginVertical: 12,
    backgroundColor: '#cbd5e1',
  },
  docSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 24,
  },
  suppDocItem: {
    paddingTop: 4,
  },
  suppDocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suppDocInfo: {
    flex: 1,
    marginRight: 10,
  },
  suppDocType: {
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 4,
  },
  suppDocActions: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  docNotes: {
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  trashIcon: {
    margin: 0,
  },
  actionRowBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  btn: {
    flex: 1,
    marginHorizontal: 8,
  },
  editBtn: {
    backgroundColor: '#2196F3',
  },
  deleteBtn: {
    borderColor: '#ef4444',
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
});
