import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  ActivityIndicator
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { getData, pushData, updateData } from '../../services/database';
import { MoreStackParamList } from '../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import { Supplier, Item } from '../../types';

type FormRouteProp = RouteProp<MoreStackParamList, 'SupplierForm'>;
type NavigationProp = StackNavigationProp<MoreStackParamList, 'SupplierForm'>;

export default function SupplierFormScreen() {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const supplierId = route.params?.supplierId;
  const isEditMode = !!supplierId;

  // Loaders
  const [initLoading, setInitLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [originalName, setOriginalName] = useState('');

  // Error alert
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode && supplierId) {
      const loadSupplier = async () => {
        try {
          const sup = await getData<Supplier>(`suppliers/${supplierId}`);
          if (sup) {
            setName(sup.name);
            setOriginalName(sup.name);
            setContactPerson(sup.contact_person || '');
            setEmail(sup.email || '');
            setPhone(sup.phone || '');
            setAddress(sup.address || '');
          }
        } catch (e: any) {
          setError(e.message || 'Error fetching supplier details.');
        } finally {
          setInitLoading(false);
        }
      };

      loadSupplier();
    }
  }, [supplierId, isEditMode]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Supplier Name is a required field.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const trimmedName = name.trim();
      const trimmedContact = contactPerson.trim();
      const trimmedEmail = email.trim();
      const trimmedPhone = phone.trim();
      const trimmedAddress = address.trim();

      if (isEditMode && supplierId) {
        // 1. Update the supplier node in Firebase
        await updateData(`suppliers/${supplierId}`, {
          name: trimmedName,
          contact_person: trimmedContact,
          email: trimmedEmail,
          phone: trimmedPhone,
          address: trimmedAddress
        });

        // 2. Cascade update to all items using the old supplier name
        if (originalName && originalName !== trimmedName) {
          const allItems = await getData<Record<string, Item>>('items');
          if (allItems) {
            const updatePromises = Object.values(allItems)
              .filter(item => item.supplier === originalName)
              .map(item => updateData(`items/${item.id}`, { supplier: trimmedName }));
            
            await Promise.all(updatePromises);
          }
        }
      } else {
        // Create Mode
        await pushData('suppliers', {
          id: '',
          name: trimmedName,
          contact_person: trimmedContact,
          email: trimmedEmail,
          phone: trimmedPhone,
          address: trimmedAddress,
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

  if (initLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching supplier specifications...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? 'Modify Partner Profile' : 'New Logistical Partner'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isEditMode ? `Updating Contact: ${originalName}` : 'Add a new supplier profile'}
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Name input */}
        <TextInput
          label="Supplier Name (Required)"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Acme Industrial Corp"
        />

        {/* Contact Person input */}
        <TextInput
          label="Contact Person Name"
          value={contactPerson}
          onChangeText={setContactPerson}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. John Doe"
        />

        {/* Email input */}
        <TextInput
          label="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          mode="outlined"
          style={styles.input}
          placeholder="e.g. jdoe@acme.com"
        />

        {/* Phone input */}
        <TextInput
          label="Telephone Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          mode="outlined"
          style={styles.input}
          placeholder="e.g. +1 (555) 019-2834"
        />

        {/* Address Input */}
        <TextInput
          label="Supplier Address Location"
          value={address}
          onChangeText={setAddress}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
          placeholder="e.g. 456 Industrial Way, Suite A, Chicago IL"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Actions Button Panel */}
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
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
  saveBtn: {
    backgroundColor: '#2196F3',
  },
});
