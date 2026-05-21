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
  HelperText,
  Divider
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProjectStackParamList } from '../../navigation/types';
import { getData, pushData, updateData } from '../../services/database';
import { User, Project } from '../../types';

type FormRouteProp = RouteProp<ProjectStackParamList, 'ProjectCreateEdit'>;
type NavigationProp = StackNavigationProp<ProjectStackParamList, 'ProjectCreateEdit'>;

export default function ProjectFormScreen() {
  const route = useRoute<FormRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { projectId } = route.params || {};

  const isEditMode = !!projectId;

  // Loaders & database states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);

  // Form Field states
  const [name, setName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [description, setDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [status, setStatus] = useState<'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled'>('Planning');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [managerId, setManagerId] = useState('');

  // Dropdown Picker Dialog controls
  const [pickerType, setPickerType] = useState<'status' | 'priority' | 'manager' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Errors feedback
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Fetch system users for manager dropdown list
        const usersData = await getData<Record<string, User>>('users');
        const usersList = usersData ? Object.values(usersData) : [];
        setManagers(usersList.filter(u => u.status === 'active'));

        // 2. Fetch project details if in Edit Mode
        if (isEditMode) {
          const proj = await getData<Project>(`projects/${projectId}`);
          if (proj) {
            setName(proj.name || '');
            setProjectCode(proj.project_code || '');
            setDescription(proj.description || '');
            setClientName(proj.client_name || '');
            setClientContact(proj.client_contact || '');
            setClientEmail(proj.client_email || '');
            setStatus(proj.status || 'Planning');
            setPriority(proj.priority || 'Medium');
            setStartDate(proj.start_date || '');
            setEndDate(proj.end_date || '');
            setBudget(String(proj.budget || ''));
            setManagerId(proj.manager_id || '');
          }
        } else {
          // Auto-generate project code (PRJ-001, PRJ-002, etc.)
          const projsData = await getData<Record<string, Project>>('projects');
          const count = projsData ? Object.keys(projsData).length : 0;
          setProjectCode(`PRJ-${String(count + 1).padStart(3, '0')}`);
          
          // Pre-populate today and 3 months later as default dates
          const today = new Date();
          const threeMonthsLater = new Date();
          threeMonthsLater.setMonth(today.getMonth() + 3);
          
          setStartDate(today.toISOString().split('T')[0]);
          setEndDate(threeMonthsLater.toISOString().split('T')[0]);
        }
      } catch (e: any) {
        setError(e.message || 'Error occurred during resource loading.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, isEditMode]);

  const openPicker = (type: 'status' | 'priority' | 'manager') => {
    setPickerType(type);
    setPickerVisible(true);
  };

  const selectOption = (val: string) => {
    if (pickerType === 'status') {
      setStatus(val as any);
    } else if (pickerType === 'priority') {
      setPriority(val as any);
    } else if (pickerType === 'manager') {
      setManagerId(val);
    }
    setPickerVisible(false);
  };

  const getSelectedLabel = (type: 'status' | 'priority' | 'manager') => {
    if (type === 'status') return status;
    if (type === 'priority') return priority;
    
    const mgr = managers.find(m => m.id === managerId);
    return mgr ? mgr.name : 'Choose Project Manager...';
  };

  const handleSubmit = async () => {
    // Form verification
    if (!name.trim()) {
      setError('Project Name is required.');
      return;
    }
    if (!clientName.trim()) {
      setError('Client Name is required.');
      return;
    }
    if (!startDate.trim() || !endDate.trim()) {
      setError('Start and End dates are required.');
      return;
    }

    const budgetVal = parseFloat(budget);
    if (isNaN(budgetVal) || budgetVal <= 0) {
      setError('Please input a valid budget amount.');
      return;
    }

    if (!managerId) {
      setError('Please choose a Project Manager.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const chosenManager = managers.find(m => m.id === managerId)!;
      
      const payload: Partial<Project> = {
        name: name.trim(),
        project_code: projectCode,
        description: description.trim(),
        client_name: clientName.trim(),
        client_contact: clientContact.trim(),
        client_email: clientEmail.trim(),
        status,
        priority,
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        budget: budgetVal,
        manager_id: managerId,
        manager_name: chosenManager.name
      };

      if (isEditMode) {
        // Edit mode update
        await updateData(`projects/${projectId}`, payload);
      } else {
        // Create mode insertion
        payload.id = '';
        payload.actual_cost = 0;
        payload.created_at = new Date().toISOString();
        payload.notes = '';

        await pushData('projects', payload);
      }

      navigation.goBack();
    } catch (e: any) {
      setError(e.message || 'Error occurred while saving project specifications.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching database catalogs...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. Header Surface Banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Text variant="headlineSmall" style={styles.title}>
          {isEditMode ? 'Modify Project' : 'Initiate Project'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {isEditMode ? 'Modify existing contractual terms' : 'Add a new construction or development project'}
        </Text>
      </Surface>

      <View style={styles.content}>
        {/* Project Name */}
        <TextInput
          label="Project Name *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Al-Hamra Villa Restoration"
        />

        {/* Project Code */}
        <TextInput
          label="Project Code (Auto Generated)"
          value={projectCode}
          editable={false}
          mode="outlined"
          style={styles.input}
        />

        {/* Description */}
        <TextInput
          label="Description Description"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={4}
          style={styles.input}
          placeholder="Detailed description of works..."
        />

        <Divider style={styles.divider} />
        <Text style={styles.sectionTitle}>Client Particulars</Text>

        {/* Client Name */}
        <TextInput
          label="Client Representative Name *"
          value={clientName}
          onChangeText={setClientName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. Yasir Khanzada"
        />

        {/* Client Contact Phone */}
        <TextInput
          label="Client Representative Contact Number"
          value={clientContact}
          onChangeText={setClientContact}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. +966 50 123 4567"
        />

        {/* Client Email */}
        <TextInput
          label="Client Representative Email"
          value={clientEmail}
          onChangeText={setClientEmail}
          mode="outlined"
          keyboardType="email-address"
          style={styles.input}
          placeholder="e.g. client@company.com"
        />

        <Divider style={styles.divider} />
        <Text style={styles.sectionTitle}>Specifications & Parameters</Text>

        {/* Status Dropdown */}
        <Text style={styles.fieldLabel}>Status State:</Text>
        <Button mode="outlined" onPress={() => openPicker('status')} icon="chevron-down" style={styles.pickerBtn} contentStyle={styles.pickerBtnContent}>
          {getSelectedLabel('status')}
        </Button>

        {/* Priority Dropdown */}
        <Text style={styles.fieldLabel}>Priority Rating:</Text>
        <Button mode="outlined" onPress={() => openPicker('priority')} icon="chevron-down" style={styles.pickerBtn} contentStyle={styles.pickerBtnContent}>
          {getSelectedLabel('priority')}
        </Button>

        {/* Start Date */}
        <TextInput
          label="Contractual Start Date (YYYY-MM-DD) *"
          value={startDate}
          onChangeText={setStartDate}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 2026-05-20"
        />

        {/* End Date */}
        <TextInput
          label="Contractual Target Date (YYYY-MM-DD) *"
          value={endDate}
          onChangeText={setEndDate}
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 2026-08-20"
        />

        {/* Budget */}
        <TextInput
          label="Initial Budget Capitalization ($) *"
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
          placeholder="e.g. 150000"
        />

        {/* Manager Dropdown */}
        <Text style={styles.fieldLabel}>Project Manager Allocation *:</Text>
        <Button mode="outlined" onPress={() => openPicker('manager')} icon="chevron-down" style={styles.pickerBtn} contentStyle={styles.pickerBtnContent}>
          {getSelectedLabel('manager')}
        </Button>

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
            Save Project
          </Button>
        </View>
      </View>

      {/* Dynamic Popups for Picker dialog */}
      <Portal>
        <Dialog visible={pickerVisible} onDismiss={() => setPickerVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>
            {pickerType === 'status' ? 'Select Project Status' : pickerType === 'priority' ? 'Select Project Priority' : 'Select Project Manager'}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerType === 'status' && ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'].map(st => (
                <TouchableOpacity key={st} style={styles.dropdownOption} onPress={() => selectOption(st)}>
                  <Text style={styles.optionText}>{st}</Text>
                </TouchableOpacity>
              ))}

              {pickerType === 'priority' && ['Low', 'Medium', 'High', 'Critical'].map(pr => (
                <TouchableOpacity key={pr} style={styles.dropdownOption} onPress={() => selectOption(pr)}>
                  <Text style={styles.optionText}>{pr}</Text>
                </TouchableOpacity>
              ))}

              {pickerType === 'manager' && managers.map(mgr => (
                <TouchableOpacity key={mgr.id} style={styles.dropdownOption} onPress={() => selectOption(mgr.id)}>
                  <Text style={styles.optionText}>{mgr.name}</Text>
                  <Text variant="bodySmall" style={styles.optionSub}>{mgr.email} ({mgr.department})</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
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
  sectionTitle: {
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
  fieldLabel: {
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
