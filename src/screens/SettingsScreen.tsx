import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  Surface, 
  Switch, 
  Divider, 
  ActivityIndicator, 
  Snackbar,
  Portal,
  Dialog,
  TextInput,
  List
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { getData, setData, updateData } from '../services/database';

export default function SettingsScreen() {
  const { user, userProfile } = useAuth();

  // Loaders
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Company settings states
  const [companyName, setCompanyName] = useState('');
  const [currencySymbol, setCurrencySymbol] = useState('SAR');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');

  // Notification toggles
  const [notifyLowStock, setNotifyLowStock] = useState(true);
  const [notifyPendingTransfers, setNotifyPendingTransfers] = useState(true);
  const [notifyExpiringDocs, setNotifyExpiringDocs] = useState(true);

  // Change password modal fields
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Snackbar feedback states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  const showNotification = (msg: string, isErr = false) => {
    setSnackbarMessage(msg);
    setSnackbarError(isErr);
    setSnackbarVisible(true);
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getData<any>('settings');
        if (data) {
          setCompanyName(data.companyName || 'EIH Company');
          setCurrencySymbol(data.currencySymbol || 'SAR');
          setLowStockThreshold(String(data.lowStockThreshold || '5'));
          setNotifyLowStock(data.notifyLowStock ?? true);
          setNotifyPendingTransfers(data.notifyPendingTransfers ?? true);
          setNotifyExpiringDocs(data.notifyExpiringDocs ?? true);
        } else {
          // Set defaults
          setCompanyName('EIH Inventory Management');
          setCurrencySymbol('SAR');
          setLowStockThreshold('5');
        }
      } catch (e: any) {
        showNotification(e.message || 'Error loading settings.', true);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const thresholdVal = parseInt(lowStockThreshold);
      if (isNaN(thresholdVal) || thresholdVal < 0) {
        showNotification('Threshold must be a valid non-negative number.', true);
        setSaving(false);
        return;
      }

      const payload = {
        companyName: companyName.trim(),
        currencySymbol: currencySymbol.trim() || 'SAR',
        lowStockThreshold: thresholdVal,
        notifyLowStock,
        notifyPendingTransfers,
        notifyExpiringDocs
      };

      await setData('settings', payload);
      showNotification('Configuration settings saved successfully.');
    } catch (e: any) {
      showNotification(e.message || 'Error occurred while saving.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('All fields are required.', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('New passwords do not match.', true);
      return;
    }

    if (newPassword.length < 6) {
      showNotification('Password must be at least 6 characters.', true);
      return;
    }

    setPasswordLoading(true);
    try {
      if (userProfile && userProfile.id) {
        // Fetch the user's secure record directly from your cloud database
        const dbUser = await getData<any>(`users/${userProfile.id}`);
        if (!dbUser) {
          throw new Error('User profile record not found on Firebase.');
        }

        if (dbUser.password !== currentPassword) {
          throw new Error('Current password is incorrect.');
        }

        // Update the password value inside the Firebase RTDB record
        await updateData(`users/${userProfile.id}`, { password: newPassword });

        setPwdModalVisible(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showNotification('Password changed successfully.');
      } else {
        showNotification('Authentication profile session expired.', true);
      }
    } catch (e: any) {
      showNotification(e.message || 'Error changing password.', true);
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Syncing settings catalog...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        
        {/* 1. Company Settings Section */}
        <List.Section title="Company Parameters" titleStyle={styles.sectionHeader}>
          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Company Name"
                value={companyName}
                onChangeText={setCompanyName}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Currency Symbol"
                value={currencySymbol}
                onChangeText={setCurrencySymbol}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Low Stock Threshold (Multiplier)"
                value={lowStockThreshold}
                onChangeText={setLowStockThreshold}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />
            </Card.Content>
          </Card>
        </List.Section>

        {/* 2. Notification Settings Section */}
        <List.Section title="Notification Configs" titleStyle={styles.sectionHeader}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="bodyLarge" style={styles.rowLabel}>Notify on Low Stock</Text>
                  <Text variant="bodySmall" style={styles.rowSub}>Alerts when items fall below safety counts</Text>
                </View>
                <Switch 
                  value={notifyLowStock} 
                  onValueChange={setNotifyLowStock} 
                  color="#2196F3" 
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="bodyLarge" style={styles.rowLabel}>Notify on Pending Transits</Text>
                  <Text variant="bodySmall" style={styles.rowSub}>Alerts when stock transits require authorization</Text>
                </View>
                <Switch 
                  value={notifyPendingTransfers} 
                  onValueChange={setNotifyPendingTransfers} 
                  color="#2196F3" 
                />
              </View>

              <Divider style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="bodyLarge" style={styles.rowLabel}>Notify on Expiring Documents</Text>
                  <Text variant="bodySmall" style={styles.rowSub}>Alerts when staff legal documents near expiration</Text>
                </View>
                <Switch 
                  value={notifyExpiringDocs} 
                  onValueChange={setNotifyExpiringDocs} 
                  color="#2196F3" 
                />
              </View>
            </Card.Content>
          </Card>
        </List.Section>

        {/* 3. Account Section */}
        <List.Section title="Operational Account" titleStyle={styles.sectionHeader}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>User Name</Text>
                <Text style={styles.accountVal}>{userProfile?.name || 'User'}</Text>
              </View>
              <Divider />
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Email Profile</Text>
                <Text style={styles.accountVal}>{userProfile?.email || 'N/A'}</Text>
              </View>
              <Divider />
              <View style={styles.accountRow}>
                <Text style={styles.accountLabel}>Clearance Level</Text>
                <Text style={[styles.accountVal, { fontWeight: 'bold', color: '#2196F3' }]}>
                  {userProfile?.role.toUpperCase() || 'STAFF'}
                </Text>
              </View>
              <Divider style={{ marginVertical: 12 }} />
              <Button 
                mode="outlined" 
                icon="key-change" 
                onPress={() => setPwdModalVisible(true)}
                style={styles.passwordBtn}
              >
                Change Credentials Password
              </Button>
            </Card.Content>
          </Card>
        </List.Section>

        {/* 4. App Info Section */}
        <List.Section title="EIH System Information" titleStyle={styles.sectionHeader}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.appRow}>
                <Text style={styles.appLabel}>Build Release Version</Text>
                <Text style={styles.appVal}>v1.1.0-RC1 (Stable)</Text>
              </View>
              <Divider />
              <Text style={styles.aboutHeader}>About EIH Inventory App</Text>
              <Text style={styles.aboutText}>
                EIH Inventory is a high-fidelity logistics and warehouse management system designed to track asset quantities, schedule stock transits, and audit project expenditures with real-time Firebase syncing.
              </Text>
            </Card.Content>
          </Card>
        </List.Section>

      </ScrollView>

      {/* Sticky Bottom Save Action */}
      <View style={styles.actionFooter}>
        <Button 
          mode="contained" 
          onPress={handleSaveSettings} 
          loading={saving} 
          disabled={saving}
          style={styles.saveBtn}
        >
          Save Configurations
        </Button>
      </View>

      {/* Change Password Dialog Modal */}
      <Portal>
        <Dialog visible={pwdModalVisible} onDismiss={() => setPwdModalVisible(false)}>
          <Dialog.Title>Update Account Password</Dialog.Title>
          <Dialog.Content>
            <TextInput 
              label="Current Password" 
              value={currentPassword} 
              onChangeText={setCurrentPassword} 
              secureTextEntry 
              mode="outlined" 
              style={styles.modalInput} 
            />
            <TextInput 
              label="New Login Password" 
              value={newPassword} 
              onChangeText={setNewPassword} 
              secureTextEntry 
              mode="outlined" 
              style={styles.modalInput} 
            />
            <TextInput 
              label="Confirm New Password" 
              value={confirmPassword} 
              onChangeText={setConfirmPassword} 
              secureTextEntry 
              mode="outlined" 
              style={styles.modalInput} 
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPwdModalVisible(false)}>Cancel</Button>
            <Button onPress={handleUpdatePassword} loading={passwordLoading} disabled={passwordLoading}>
              Update Password
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Alerts Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3500}
        style={{ backgroundColor: snackbarError ? '#ef4444' : '#10b981' }}
      >
        {snackbarMessage}
      </Snackbar>
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
  scroll: {
    flex: 1,
  },
  sectionHeader: {
    fontWeight: 'bold',
    color: '#475569',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 1,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    marginRight: 10,
  },
  rowLabel: {
    fontWeight: '600',
    color: '#1e293b',
  },
  rowSub: {
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    marginVertical: 4,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'center',
  },
  accountLabel: {
    fontWeight: 'bold',
    color: '#64748b',
    fontSize: 13,
  },
  accountVal: {
    color: '#0f172a',
  },
  passwordBtn: {
    borderColor: '#cbd5e1',
    marginTop: 4,
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'center',
  },
  appLabel: {
    fontWeight: 'bold',
    color: '#64748b',
    fontSize: 13,
  },
  appVal: {
    color: '#10b981',
    fontWeight: '600',
  },
  aboutHeader: {
    fontWeight: 'bold',
    color: '#475569',
    fontSize: 13,
    marginTop: 14,
    marginBottom: 4,
  },
  aboutText: {
    color: '#64748b',
    lineHeight: 18,
    fontSize: 13,
  },
  actionFooter: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  saveBtn: {
    backgroundColor: '#2196F3',
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
});
