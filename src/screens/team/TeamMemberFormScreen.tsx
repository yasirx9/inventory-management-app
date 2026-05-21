import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import { getData, pushData, updateData } from '../../services/database';
import { TeamMember } from '../../types';

type FormRouteProp = RouteProp<MoreStackParamList, 'TeamMemberForm'>;
type NavigationProp = StackNavigationProp<MoreStackParamList, 'TeamMemberForm'>;

export default function TeamMemberFormScreen() {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { memberId } = route.params || {};

  const isEditMode = !!memberId;

  // Loaders
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Field states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [iqamaNumber, setIqamaNumber] = useState('');
  const [iqamaExpiry, setIqamaExpiry] = useState('');

  const [passportNumber, setPassportNumber] = useState('');
  const [passportExpiry, setPassportExpiry] = useState('');

  // Dropdown dialog controls for Status
  const [statusVisible, setStatusVisible] = useState(false);

  // Errors feedback
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMember = async () => {
      try {
        if (isEditMode) {
          const tm = await getData<TeamMember>(`team_members/${memberId}`);
          if (tm) {
            setName(tm.name || '');
            setEmail(tm.email || '');
            setPhone(tm.phone || '');
            setRole(tm.role || '');
            setDepartment(tm.department || '');
            setStatus(tm.status || 'active');
            setIqamaNumber(tm.iqama_number || '');
            setIqamaExpiry(tm.iqama_expiry || '');
            setPassportNumber(tm.passport_number || '');
            setPassportExpiry(tm.passport_expiry || '');
          }
        }
      } catch (e: any) {
        setError(e.message || 'Error occurred while loading member details.');
      } finally {
        setLoading(false);
      }
    };

    loadMember();
  }, [memberId, isEditMode]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Staff Name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload: Partial<TeamMember> = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role: role.trim() || 'General Laborer',
        department: department.trim() || 'Logistics',
        status,
        iqama_number: iqamaNumber.trim(),
        iqama_expiry: iqamaExpiry.trim(),
        passport_number: passportNumber.trim(),
        passport_expiry: passportExpiry.trim()
      };

      if (isEditMode) {
        // Edit Mode Update
        await updateData(`team_members/${memberId}`, payload);
      } else {
        // Create Mode Insertion
        payload.id = '';
        payload.created_at = new Date().toISOString();
        await pushData('team_members', payload);
      }

      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Error occurred while saving staff dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching database dossier...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Header Surface Banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? 'Modify Staff Dossier' : 'Register Team Member'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isEditMode ? 'Modify legal or logistical employee details' : 'Register a new employee into EIH Inventory system'}
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Name */}
        <TextInput
          label="Full Legal Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Yasir Khanzada"
        />

        {/* Email */}
        <TextInput
          label="Professional Email Address"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          style={styles.input}
          placeholder="e.g. employee@company.com"
        />

        {/* Phone */}
        <TextInput
          label="Primary Mobile Phone Number"
          value={phone}
          onChangeText={setPhone}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. +966 50 123 4567"
        />

        {/* Role */}
        <TextInput
          label="Assigned Job Role"
          value={role}
          onChangeText={setRole}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Procurement Lead"
        />

        {/* Department */}
        <TextInput
          label="Operations Department"
          value={department}
          onChangeText={setDepartment}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Supply Chain"
        />

        {/* Status Toggle Row */}
        <Text style={styles.label}>Employment Status:</Text>
        <ToggleButton.Row onValueChange={val => setStatus(val as any)} value={status} style={styles.toggleRow}>
          <ToggleButton icon="check" value="active" style={styles.toggleBtn}>
            <Text style={{ color: status === 'active' ? '#2196F3' : '#64748b' }}>Active</Text>
          </ToggleButton>
          <ToggleButton icon="close" value="inactive" style={styles.toggleBtn}>
            <Text style={{ color: status === 'inactive' ? '#ef4444' : '#64748b' }}>Inactive</Text>
          </ToggleButton>
        </ToggleButton.Row>

        <Divider style={styles.divider} />
        <Text style={styles.sectionHeader}>CNIC Specifications</Text>

        {/* CNIC Number */}
        <TextInput
          label="CNIC Number (e.g. 13 digits)"
          value={iqamaNumber}
          onChangeText={setIqamaNumber}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 37405-1234567-1"
        />

        {/* CNIC Expiry Date */}
        <TextInput
          label="CNIC Expiry Date (YYYY-MM-DD)"
          value={iqamaExpiry}
          onChangeText={setIqamaExpiry}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 2027-02-18"
        />

        <Divider style={styles.divider} />
        <Text style={styles.sectionHeader}>Passport Details</Text>

        {/* Passport Number */}
        <TextInput
          label="Passport Identification Number"
          value={passportNumber}
          onChangeText={setPassportNumber}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. A01234567"
        />

        {/* Passport Expiry Date */}
        <TextInput
          label="Passport Expiry Date (YYYY-MM-DD)"
          value={passportExpiry}
          onChangeText={setPassportExpiry}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 2028-11-20"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Action Button Panel */}
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
            Save Profile
          </Button>
        </View>
      </View>
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
    marginTop: 2,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  label: {
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 8,
    marginBottom: 6,
    fontSize: 13,
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
  },
  toggleBtn: {
    flex: 1,
    borderWidth: 0,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginVertical: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#cbd5e1',
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
});
