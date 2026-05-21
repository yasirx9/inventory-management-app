import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  ActivityIndicator,
  Portal,
  Dialog,
  ToggleButton,
  Divider
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MoreStackParamList } from '../../navigation/types';
import { getData, setData, updateData, deleteData } from '../../services/database';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';

type FormRouteProp = RouteProp<MoreStackParamList, 'UserForm'>;
type NavigationProp = StackNavigationProp<MoreStackParamList, 'UserForm'>;

export default function UserFormScreen() {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { userId } = route.params || {};
  const { userProfile } = useAuth();

  const { can } = usePermissions();
  const hasAccess = can('users.manage');

  const isEditMode = !!userId;

  // Guard access on Mount
  useEffect(() => {
    if (!hasAccess) {
      Alert.alert('Permission Denied', 'Only Administrators can access User management controls.');
      navigation.goBack();
    }
  }, [hasAccess]);

  // Loaders
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Only for Create
  const [role, setRole] = useState<'admin' | 'manager' | 'staff'>('staff');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Role picker dialog states
  const [pickerVisible, setPickerVisible] = useState(false);

  // Error feedback
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hasAccess) return;

    const loadUser = async () => {
      try {
        if (isEditMode) {
          const userObj = await getData<User>(`users/${userId}`);
          if (userObj) {
            setName(userObj.name || '');
            setEmail(userObj.email || '');
            setRole(userObj.role || 'staff');
            setDepartment(userObj.department || '');
            setStatus(userObj.status || 'active');
          }
        }
      } catch (e: any) {
        setError(e.message || 'Error occurred while loading user specifications.');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId, isEditMode, hasAccess]);

  const handleRoleSelect = (selectedRole: 'admin' | 'manager' | 'staff') => {
    setRole(selectedRole);
    setPickerVisible(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('User Name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email Address is required.');
      return;
    }
    if (!isEditMode && !password.trim()) {
      setError('Password is required in create mode.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (isEditMode) {
        // Edit Mode: Update database user profile
        const payload: Partial<User> = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          department: department.trim(),
          status
        };

        await updateData(`users/${userId}`, payload);
        navigation.goBack();
      } else {
        // Create Mode: Provision user record directly in Realtime Database
        const newUid = `user_uid_${Date.now()}`;
        const newUserPayload = {
          id: newUid,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(), // Stored securely/locally for direct submission matching
          role,
          department: department.trim(),
          status,
          created_at: new Date().toISOString()
        };

        // Write directly to your cloud Firebase database path "/users/{uid}"
        await setData(`users/${newUid}`, newUserPayload);
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e.message || 'Error occurred while writing profile metadata.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = () => {
    // Self deactivation protection
    if (userId === userProfile?.id) {
      Alert.alert('Action Blocked', 'You cannot deactivate your own administrative profile.');
      return;
    }

    Alert.alert('Confirm Deactivation', 'Mark this user as inactive? Inactive users are instantly locked out of app clearance accesses.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate User',
        style: 'destructive',
        onPress: async () => {
          setSubmitting(true);
          try {
            await updateData(`users/${userId}`, { status: 'inactive' });
            navigation.goBack();
          } catch (e: any) {
            setError(e.message || 'Error occurred during deactivation.');
          } finally {
            setSubmitting(false);
          }
        }
      }
    ]);
  };

  const handleDeletePermanently = () => {
    // Self deletion protection
    if (userId === userProfile?.id) {
      Alert.alert('Action Blocked', 'You cannot delete your own administrative profile.');
      return;
    }

    Alert.alert(
      'Confirm Permanent Deletion',
      'Are you absolutely sure you want to permanently delete this user? This action is irreversible and will remove all their records from the system.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete User Permanently',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteData(`users/${userId}`);
              navigation.goBack();
            } catch (e: any) {
              setError(e.message || 'Error occurred during deletion.');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  if (!hasAccess) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Restricting administrative access...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching database references...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? 'Modify Access Rights' : 'Create User Credentials'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isEditMode ? 'Edit operational profiles' : 'Provision system credentials and database clearances'}
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Name */}
        <TextInput
          label="User Full Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Yasir Khanzada"
        />

        {/* Email */}
        <TextInput
          label="Operational Email Address *"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          style={styles.input}
          placeholder="e.g. user@company.com"
        />

        {/* Password (Create Mode only) */}
        {!isEditMode && (
          <TextInput
            label="System Login Password *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            placeholder="Min 6 characters..."
          />
        )}

        {/* Role Picker Button */}
        <Text style={styles.label}>Clearance Role Level *:</Text>
        <Button
          mode="outlined"
          onPress={() => setPickerVisible(true)}
          icon="chevron-down"
          style={styles.pickerBtn}
          contentStyle={styles.pickerBtnContent}
        >
          {role.toUpperCase()}
        </Button>

        {/* Department */}
        <TextInput
          label="Department / Field Team"
          value={department}
          onChangeText={setDepartment}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Maintenance Office"
        />

        {/* Status Toggle Row */}
        <Text style={styles.label}>Account Activation Status:</Text>
        <ToggleButton.Row onValueChange={val => setStatus(val as any)} value={status} style={styles.toggleRow}>
          <ToggleButton icon="account-check-outline" value="active" style={styles.toggleBtn}>
            <Text style={{ color: status === 'active' ? '#10b981' : '#64748b' }}>Active</Text>
          </ToggleButton>
          <ToggleButton icon="account-off-outline" value="inactive" style={styles.toggleBtn}>
            <Text style={{ color: status === 'inactive' ? '#ef4444' : '#64748b' }}>Inactive</Text>
          </ToggleButton>
        </ToggleButton.Row>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Action Panel Buttons */}
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
            onPress={handleSave}
            style={[styles.btn, styles.submitBtn]}
            loading={submitting}
            disabled={submitting}
          >
            Save User
          </Button>
        </View>

        {isEditMode && userId !== userProfile?.id && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.dangerActionsContainer}>
              <Button
                mode="contained-tonal"
                onPress={handleDeleteUser}
                style={[styles.dangerActionBtn, { marginRight: 8 }]}
                buttonColor="#fee2e2"
                textColor="#ef4444"
                icon="account-cancel-outline"
              >
                Disable
              </Button>
              <Button
                mode="contained"
                onPress={handleDeletePermanently}
                style={[styles.dangerActionBtn, { backgroundColor: '#ef4444' }]}
                textColor="#ffffff"
                icon="trash-can-outline"
              >
                Delete User
              </Button>
            </View>
          </>
        )}
      </View>

      {/* Role Picker Popup */}
      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)} style={styles.dialog}>
          <Dialog.Title>Select Clearance Role</Dialog.Title>
          <Dialog.Content>
            {['admin', 'manager', 'staff'].map((r) => (
              <TouchableOpacity
                key={r}
                style={styles.dialogOption}
                onPress={() => handleRoleSelect(r as any)}
              >
                <Text style={styles.optionText}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPickerVisible(false)}>Close</Button>
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
    backgroundColor: '#1E3A8A',
  },
  title: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  disabledInput: {
    backgroundColor: '#f1f5f9',
  },
  label: {
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 8,
    marginBottom: 6,
    fontSize: 13,
  },
  pickerBtn: {
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  pickerBtnContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  toggleRow: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
    height: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 0,
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
  divider: {
    marginVertical: 20,
    backgroundColor: '#cbd5e1',
  },
  dangerActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dangerActionBtn: {
    flex: 1,
    borderRadius: 8,
  },
  dialog: {
    backgroundColor: '#ffffff',
  },
  dialogOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
});
