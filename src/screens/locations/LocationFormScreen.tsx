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
import { Location, Item } from '../../types';

type FormRouteProp = RouteProp<MoreStackParamList, 'LocationForm'>;
type NavigationProp = StackNavigationProp<MoreStackParamList, 'LocationForm'>;

export default function LocationFormScreen() {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const locationId = route.params?.locationId;
  const isEditMode = !!locationId;

  // Loaders
  const [initLoading, setInitLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalName, setOriginalName] = useState('');

  // Error alert
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEditMode && locationId) {
      const loadLocation = async () => {
        try {
          const loc = await getData<Location>(`locations/${locationId}`);
          if (loc) {
            setName(loc.name);
            setOriginalName(loc.name);
            setDescription(loc.description || '');
          }
        } catch (e: any) {
          setError(e.message || 'Error fetching location specifications.');
        } finally {
          setInitLoading(false);
        }
      };

      loadLocation();
    }
  }, [locationId, isEditMode]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Location Name is a required field.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const trimmedName = name.trim();
      const trimmedDesc = description.trim();

      if (isEditMode && locationId) {
        // 1. Update the location node in Firebase
        await updateData(`locations/${locationId}`, {
          name: trimmedName,
          description: trimmedDesc
        });

        // 2. Cascade update to all items using the old location name
        if (originalName && originalName !== trimmedName) {
          const allItems = await getData<Record<string, Item>>('items');
          if (allItems) {
            const updatePromises = Object.values(allItems)
              .filter(item => item.location === originalName)
              .map(item => updateData(`items/${item.id}`, { location: trimmedName }));
            
            await Promise.all(updatePromises);
          }
        }
      } else {
        // Create Mode
        await pushData('locations', {
          id: '',
          name: trimmedName,
          description: trimmedDesc,
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
        <Text style={styles.loadingText}>Fetching location specifications...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? 'Modify Storage Depot' : 'New Storage Depot Location'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isEditMode ? `Updating specs for: ${originalName}` : 'Configure a new storage vault'}
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Name input */}
        <TextInput
          label="Location Name (Required)"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Warehouse Zone B"
        />

        {/* Description Input */}
        <TextInput
          label="Description Details"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
          placeholder="Details describing materials stored or sector coordinates..."
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
