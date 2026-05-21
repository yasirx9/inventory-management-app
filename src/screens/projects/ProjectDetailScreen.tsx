import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Alert } from 'react-native';
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
  ProgressBar
} from 'react-native-paper';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { listenToData, updateData, pushData, deleteData, getData } from '../../services/database';
import { ProjectStackParamList } from '../../navigation/types';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  Project, 
  ProjectService, 
  ProjectPhase, 
  ProjectMaterial, 
  ProjectTeamMember, 
  ProjectPayment, 
  ProjectFile, 
  ProjectUpdate,
  Item,
  ItemLocation,
  Location,
  TeamMember
} from '../../types';

type DetailRouteProp = RouteProp<ProjectStackParamList, 'ProjectDetail'>;
type NavigationProp = StackNavigationProp<ProjectStackParamList, 'ProjectDetail'>;

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'information' },
  { key: 'services', label: 'Services', icon: 'hammer-wrench' },
  { key: 'phases', label: 'Phases', icon: 'format-list-bulleted' },
  { key: 'materials', label: 'Materials', icon: 'package-variant' },
  { key: 'team', label: 'Team', icon: 'account-group' },
  { key: 'payments', label: 'Payments', icon: 'cash-multiple' },
  { key: 'files', label: 'Files', icon: 'file-multiple' },
  { key: 'updates', label: 'Updates', icon: 'comment-text-multiple' }
];

export default function ProjectDetailScreen() {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { projectId } = route.params;
  const { userProfile } = useAuth();
  const isAdminOrManager = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  // Main Project Resource
  const [project, setProject] = useState<Project | null>(null);

  // Sub-resource lists
  const [services, setServices] = useState<ProjectService[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [team, setTeam] = useState<ProjectTeamMember[]>([]);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);

  // Generic lists for selectors
  const [inventoryItems, setInventoryItems] = useState<Item[]>([]);
  const [itemLocations, setItemLocations] = useState<ItemLocation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<TeamMember[]>([]);

  // Snackbar feedback states
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);

  // Modal controls
  const [modalVisible, setModalVisible] = useState<string | null>(null); // 'service' | 'phase' | 'material' | 'team' | 'payment' | 'file' | 'update' | 'issue'
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  // Form states for modals
  const [serviceName, setServiceName] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');

  const [phaseName, setPhaseName] = useState('');
  const [phaseStart, setPhaseStart] = useState('');
  const [phaseEnd, setPhaseEnd] = useState('');

  const [materialItemId, setMaterialItemId] = useState('');
  const [materialQtyNeeded, setMaterialQtyNeeded] = useState('');
  const [materialItemSearchOpen, setMaterialItemSearchOpen] = useState(false);

  const [teamMemberId, setTeamMemberId] = useState('');
  const [teamRole, setTeamRole] = useState('');
  const [teamSearchOpen, setTeamSearchOpen] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');

  const [updateNote, setUpdateNote] = useState('');

  // Issue stock states
  const [issueQty, setIssueQty] = useState('');
  const [issueLocationId, setIssueLocationId] = useState('');
  const [issueLocationPickerOpen, setIssueLocationPickerOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<ProjectMaterial | null>(null);

  const showNotification = (msg: string, isErr = false) => {
    setSnackbarMessage(msg);
    setSnackbarError(isErr);
    setSnackbarVisible(true);
  };

  useEffect(() => {
    // 1. Subscribe to Core Project
    const unsubProj = listenToData<Project>(`projects/${projectId}`, (data) => {
      setProject(data);
      setLoading(false);
    });

    // 2. Subscribe to sub-resources
    const unsubServices = listenToData<Record<string, ProjectService>>('project_services', (data) => {
      if (data) {
        setServices(Object.values(data).filter(s => s.project_id === projectId));
      } else {
        setServices([]);
      }
    });

    const unsubPhases = listenToData<Record<string, ProjectPhase>>('project_phases', (data) => {
      if (data) {
        setPhases(Object.values(data).filter(p => p.project_id === projectId));
      } else {
        setPhases([]);
      }
    });

    const unsubMaterials = listenToData<Record<string, ProjectMaterial>>('project_materials', (data) => {
      if (data) {
        setMaterials(Object.values(data).filter(m => m.project_id === projectId));
      } else {
        setMaterials([]);
      }
    });

    const unsubTeam = listenToData<Record<string, ProjectTeamMember>>('project_team_members', (data) => {
      if (data) {
        setTeam(Object.values(data).filter(t => t.project_id === projectId));
      } else {
        setTeam([]);
      }
    });

    const unsubPayments = listenToData<Record<string, ProjectPayment>>('project_payments', (data) => {
      if (data) {
        setPayments(Object.values(data).filter(p => p.project_id === projectId));
      } else {
        setPayments([]);
      }
    });

    const unsubFiles = listenToData<Record<string, ProjectFile>>('project_files', (data) => {
      if (data) {
        setFiles(Object.values(data).filter(f => f.project_id === projectId));
      } else {
        setFiles([]);
      }
    });

    const unsubUpdates = listenToData<Record<string, ProjectUpdate>>('project_updates', (data) => {
      if (data) {
        const filtered = Object.values(data)
          .filter(u => u.project_id === projectId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setUpdates(filtered);
      } else {
        setUpdates([]);
      }
    });

    // 3. Load drop lists once
    const loadSelectionAssets = async () => {
      const [itemsData, locsData, itemLocsData, teamData] = await Promise.all([
        getData<Record<string, Item>>('items'),
        getData<Record<string, Location>>('locations'),
        getData<Record<string, ItemLocation>>('item_locations'),
        getData<Record<string, TeamMember>>('team_members')
      ]);
      setInventoryItems(itemsData ? Object.values(itemsData) : []);
      setLocations(locsData ? Object.values(locsData) : []);
      setItemLocations(itemLocsData ? Object.values(itemLocsData) : []);
      setUsers(teamData ? Object.values(teamData) : []);
    };
    loadSelectionAssets();

    return () => {
      unsubProj();
      unsubServices();
      unsubPhases();
      unsubMaterials();
      unsubTeam();
      unsubPayments();
      unsubFiles();
      unsubUpdates();
    };
  }, [projectId]);

  // Recalculate Actual Cost based on services & materials & payments
  const handleServiceSave = async () => {
    if (!serviceName.trim() || !serviceCost.trim()) {
      showNotification('Service Name and Cost are required.', true);
      return;
    }
    setActioning(true);

    try {
      const costNum = parseFloat(serviceCost);
      if (isNaN(costNum) || costNum < 0) {
        showNotification('Please input a valid cost.', true);
        setActioning(false);
        return;
      }

      if (selectedSubId) {
        // Edit mode
        await updateData(`project_services/${selectedSubId}`, {
          service_name: serviceName.trim(),
          cost: costNum,
          description: serviceDesc.trim()
        });
      } else {
        // Create mode
        await pushData('project_services', {
          id: '',
          project_id: projectId,
          service_name: serviceName.trim(),
          cost: costNum,
          description: serviceDesc.trim()
        });
      }

      // Recalculate Project actual cost
      const newActual = services.reduce((acc, curr) => {
        if (curr.id === selectedSubId) return acc + costNum;
        return acc + curr.cost;
      }, selectedSubId ? 0 : costNum);

      await updateData(`projects/${projectId}`, { actual_cost: newActual });

      setModalVisible(null);
      setSelectedSubId(null);
      setServiceName('');
      setServiceCost('');
      setServiceDesc('');
      showNotification('Service saved successfully.');
    } catch (e: any) {
      showNotification(e.message || 'Error occurred.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleServiceDelete = async (id: string, cost: number) => {
    Alert.alert('Confirm Delete', 'Remove this service from project?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteData(`project_services/${id}`);
            const newActual = Math.max(0, (project?.actual_cost || 0) - cost);
            await updateData(`projects/${projectId}`, { actual_cost: newActual });
            showNotification('Service deleted.');
          } catch (e: any) {
            showNotification(e.message || 'Error.', true);
          }
        }
      }
    ]);
  };

  // Phase transition toggle
  const togglePhaseStatus = async (phase: ProjectPhase) => {
    if (!isAdminOrManager) return;
    const nextStatus = phase.status === 'Not Started' 
      ? 'In Progress' 
      : phase.status === 'In Progress' 
        ? 'Completed' 
        : 'Not Started';

    try {
      await updateData(`project_phases/${phase.id}`, { status: nextStatus });
      showNotification(`Phase set to ${nextStatus}.`);
    } catch (e: any) {
      showNotification(e.message || 'Error.', true);
    }
  };

  const handlePhaseSave = async () => {
    if (!phaseName.trim()) return;
    setActioning(true);

    try {
      await pushData('project_phases', {
        id: '',
        project_id: projectId,
        phase_name: phaseName.trim(),
        start_date: phaseStart || new Date().toISOString(),
        end_date: phaseEnd || new Date().toISOString(),
        status: 'Not Started'
      });

      setModalVisible(null);
      setPhaseName('');
      setPhaseStart('');
      setPhaseEnd('');
      showNotification('Phase registered.');
    } catch (e: any) {
      showNotification(e.message || 'Error.', true);
    } finally {
      setActioning(false);
    }
  };

  // Materials issue operation
  const handleMaterialSave = async () => {
    if (!materialItemId || !materialQtyNeeded) {
      showNotification('Please select an item and enter required quantity.', true);
      return;
    }
    setActioning(true);

    try {
      const qtyNum = parseInt(materialQtyNeeded);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        showNotification('Invalid quantity.', true);
        setActioning(false);
        return;
      }

      const itemObj = inventoryItems.find(i => i.id === materialItemId)!;

      await pushData('project_materials', {
        id: '',
        project_id: projectId,
        item_id: materialItemId,
        item_name: itemObj.item_name,
        quantity_needed: qtyNum,
        quantity_issued: 0
      });

      setModalVisible(null);
      setMaterialItemId('');
      setMaterialQtyNeeded('');
      showNotification('Required material registered.');
    } catch (e: any) {
      showNotification(e.message || 'Error saving material.', true);
    } finally {
      setActioning(false);
    }
  };

  const triggerIssueModal = (mat: ProjectMaterial) => {
    setSelectedMaterial(mat);
    setIssueQty('');
    setIssueLocationId('');
    setModalVisible('issue');
  };

  const executeIssueStock = async () => {
    if (!selectedMaterial || !issueLocationId || !issueQty) {
      showNotification('All fields are required.', true);
      return;
    }
    const qtyToIssue = parseInt(issueQty);
    if (isNaN(qtyToIssue) || qtyToIssue <= 0) {
      showNotification('Invalid quantity.', true);
      return;
    }

    setActioning(true);

    try {
      // Find matching item location record
      const matchLocRecord = itemLocations.find(
        il => il.item_id === selectedMaterial.item_id && il.location_id === issueLocationId
      );

      if (!matchLocRecord || matchLocRecord.quantity < qtyToIssue) {
        showNotification('Insufficient stock in selected depot.', true);
        setActioning(false);
        return;
      }

      // 1. Deduct from /item_locations
      const newLocQty = matchLocRecord.quantity - qtyToIssue;
      await updateData(`item_locations/${matchLocRecord.id}`, { quantity: newLocQty });

      // 2. Deduct from core item stock
      const coreItem = inventoryItems.find(i => i.id === selectedMaterial.item_id)!;
      const newCoreQty = Math.max(0, coreItem.quantity - qtyToIssue);
      let newCoreStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (newCoreQty <= 0) {
        newCoreStatus = 'Out of Stock';
      } else if (newCoreQty <= coreItem.reorder_level) {
        newCoreStatus = 'Low Stock';
      }

      await updateData(`items/${coreItem.id}`, {
        quantity: newCoreQty,
        status: newCoreStatus
      });

      // 3. Update quantity_issued in `/project_materials`
      const newIssuedQty = selectedMaterial.quantity_issued + qtyToIssue;
      await updateData(`project_materials/${selectedMaterial.id}`, {
        quantity_issued: newIssuedQty
      });

      // 4. Update project actual cost based on issued material value
      const materialCostValue = qtyToIssue * (coreItem.cost || 0);
      const newProjCost = (project?.actual_cost || 0) + materialCostValue;
      await updateData(`projects/${projectId}`, { actual_cost: newProjCost });

      // 5. Log stock movement
      const locationObj = locations.find(l => l.id === issueLocationId)!;
      await pushData('stock_movements', {
        item_id: selectedMaterial.item_id,
        item_name: selectedMaterial.item_name,
        type: 'out',
        quantity: qtyToIssue,
        from_location: locationObj.name,
        notes: `Issued to project [${project?.project_code || 'PRJ'}]`,
        user_id: userProfile?.id || 'unknown_user',
        created_at: new Date().toISOString()
      });

      setModalVisible(null);
      setSelectedMaterial(null);
      showNotification(`Successfully issued ${qtyToIssue} units to project.`);
    } catch (e: any) {
      showNotification(e.message || 'Error occurred.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleTeamSave = async () => {
    if (!teamMemberId || !teamRole.trim()) {
      showNotification('Member name and Role are required.', true);
      return;
    }
    setActioning(true);

    try {
      const member = users.find(u => u.id === teamMemberId)!;

      await pushData('project_team_members', {
        id: '',
        project_id: projectId,
        member_id: teamMemberId,
        member_name: member.name,
        role: teamRole.trim()
      });

      setModalVisible(null);
      setTeamMemberId('');
      setTeamRole('');
      showNotification('Team member assigned.');
    } catch (e: any) {
      showNotification(e.message || 'Error.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleTeamRemove = async (id: string) => {
    Alert.alert('Confirm Remove', 'Remove member from team?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteData(`project_team_members/${id}`);
            showNotification('Team member removed.');
          } catch (e: any) {
            showNotification(e.message || 'Error.', true);
          }
        }
      }
    ]);
  };

  const handlePaymentSave = async () => {
    if (!paymentAmount.trim()) return;
    setActioning(true);

    try {
      const amt = parseFloat(paymentAmount);
      if (isNaN(amt) || amt <= 0) {
        showNotification('Invalid amount.', true);
        setActioning(false);
        return;
      }

      await pushData('project_payments', {
        id: '',
        project_id: projectId,
        amount: amt,
        payment_date: new Date().toISOString(),
        notes: paymentNotes.trim()
      });

      setModalVisible(null);
      setPaymentAmount('');
      setPaymentNotes('');
      showNotification('Payment registered.');
    } catch (e: any) {
      showNotification(e.message || 'Error.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleFileSave = async () => {
    if (!fileName.trim()) return;
    setActioning(true);

    try {
      await pushData('project_files', {
        id: '',
        project_id: projectId,
        file_name: fileName.trim(),
        file_type: fileType.trim() || 'PDF Document',
        created_at: new Date().toISOString()
      });

      setModalVisible(null);
      setFileName('');
      setFileType('');
      showNotification('File metadata recorded.');
    } catch (e: any) {
      showNotification(e.message || 'Error.', true);
    } finally {
      setActioning(false);
    }
  };

  const handleUpdateSave = async () => {
    if (!updateNote.trim()) return;
    setActioning(true);

    try {
      await pushData('project_updates', {
        id: '',
        project_id: projectId,
        note: updateNote.trim(),
        user_id: userProfile?.id || 'unknown',
        user_name: userProfile?.name || 'User',
        created_at: new Date().toISOString()
      });

      setModalVisible(null);
      setUpdateNote('');
      showNotification('Update note posted.');
    } catch (e: any) {
      showNotification(e.message || 'Error.', true);
    } finally {
      setActioning(false);
    }
  };

  if (loading || !project) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Fetching project specs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Header Hero Banner */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Avatar.Icon size={54} icon="briefcase" style={styles.avatarIcon} color="#ffffff" />
        <View style={styles.headerText}>
          <Text variant="headlineSmall" style={styles.projTitle}>{project.name}</Text>
          <Text variant="bodyMedium" style={styles.projCode}>Code: {project.project_code}</Text>
        </View>
        {isAdminOrManager && (
          <IconButton 
            icon="pencil" 
            iconColor="#ffffff" 
            onPress={() => navigation.navigate('ProjectCreateEdit', { projectId })} 
          />
        )}
      </Surface>

      {/* 2. Top Scrollable Tab Selection Bar */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => {
            const isSel = activeTab === tab.key;
            return (
              <TouchableOpacity 
                key={tab.key}
                style={[styles.tabBtn, isSel && styles.tabBtnSel]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabLabel, isSel && styles.tabLabelSel]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Tab Screen Content Router */}
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View style={styles.sectionPadding}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>Overview Details</Text>
                
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Client Name</Text>
                  <Text style={styles.specVal}>{project.client_name}</Text>
                </View>
                <Divider />
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Contact Info</Text>
                  <Text style={styles.specVal}>{project.client_contact} ({project.client_email})</Text>
                </View>
                <Divider />
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Manager</Text>
                  <Text style={styles.specVal}>{project.manager_name || 'N/A'}</Text>
                </View>
                <Divider />
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Start Date</Text>
                  <Text style={styles.specVal}>{new Date(project.start_date).toLocaleDateString()}</Text>
                </View>
                <Divider />
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Expected End Date</Text>
                  <Text style={styles.specVal}>{new Date(project.end_date).toLocaleDateString()}</Text>
                </View>
                <Divider />
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Status State</Text>
                  <Text style={styles.specVal}>{project.status}</Text>
                </View>
                <Divider />
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Project Priority</Text>
                  <Text style={styles.specVal}>{project.priority}</Text>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>Financial Statistics</Text>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Budget Allocation</Text>
                  <Text style={[styles.specVal, { fontWeight: 'bold' }]}>${project.budget.toLocaleString()}</Text>
                </View>
                <Divider />
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Actual Cost Spent</Text>
                  <Text style={[styles.specVal, { color: project.actual_cost > project.budget ? '#ef4444' : '#10b981', fontWeight: 'bold' }]}>
                    ${project.actual_cost.toLocaleString()}
                  </Text>
                </View>
                {project.description ? (
                  <>
                    <Divider />
                    <Text style={styles.specLabelDescription}>Description Details:</Text>
                    <Text style={styles.descriptionText}>{project.description}</Text>
                  </>
                ) : null}
              </Card.Content>
            </Card>
          </View>
        )}

        {activeTab === 'services' && (
          <View style={styles.sectionPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.tabSectionHeader}>Project Services</Text>
              {isAdminOrManager && (
                <Button mode="outlined" size="small" onPress={() => setModalVisible('service')} icon="plus">
                  Add Service
                </Button>
              )}
            </View>

            {services.length === 0 ? (
              <Text style={styles.emptyText}>No services registered for this project yet.</Text>
            ) : (
              services.map(s => (
                <Card style={styles.subCard} key={s.id}>
                  <Card.Content style={styles.subCardContent}>
                    <View style={styles.subInfo}>
                      <Text variant="titleMedium" style={styles.subName}>{s.service_name}</Text>
                      {s.description ? <Text variant="bodySmall" style={styles.subDesc}>{s.description}</Text> : null}
                      <Text variant="titleSmall" style={styles.subCost}>Cost: ${s.cost.toLocaleString()}</Text>
                    </View>
                    {isAdminOrManager && (
                      <IconButton icon="trash-can-outline" iconColor="#ef4444" size={20} onPress={() => handleServiceDelete(s.id, s.cost)} />
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'phases' && (
          <View style={styles.sectionPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.tabSectionHeader}>Timeline Phases</Text>
              {isAdminOrManager && (
                <Button mode="outlined" onPress={() => setModalVisible('phase')} icon="plus">
                  Add Phase
                </Button>
              )}
            </View>

            {phases.length === 0 ? (
              <Text style={styles.emptyText}>No project timeline phases defined yet.</Text>
            ) : (
              phases.map(p => (
                <Card style={styles.subCard} key={p.id} onPress={() => togglePhaseStatus(p)}>
                  <Card.Content style={styles.subCardContent}>
                    <View style={styles.subInfo}>
                      <Text variant="titleMedium" style={styles.subName}>{p.phase_name}</Text>
                      <Text variant="bodySmall" style={styles.subDesc}>
                        Target Date: {new Date(p.end_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <Badge 
                      style={[
                        styles.phaseBadge, 
                        { backgroundColor: p.status === 'Completed' ? '#10b981' : p.status === 'In Progress' ? '#2196F3' : '#64748b' }
                      ]}
                    >
                      {p.status}
                    </Badge>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'materials' && (
          <View style={styles.sectionPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.tabSectionHeader}>Materials Inventory Split</Text>
              {isAdminOrManager && (
                <Button mode="outlined" onPress={() => setModalVisible('material')} icon="plus">
                  Add Material
                </Button>
              )}
            </View>

            {materials.length === 0 ? (
              <Text style={styles.emptyText}>No materials specified for this project.</Text>
            ) : (
              materials.map(m => {
                const issuedPercentage = Math.min(1, m.quantity_issued / m.quantity_needed);
                return (
                  <Card style={styles.subCard} key={m.id}>
                    <Card.Content>
                      <View style={styles.materialHeader}>
                        <Text variant="titleMedium" style={styles.subName}>{m.item_name}</Text>
                        <Text variant="bodySmall" style={styles.materialQtyLabel}>
                          Issued: {m.quantity_issued} / {m.quantity_needed} units
                        </Text>
                      </View>
                      
                      <ProgressBar progress={issuedPercentage} color={issuedPercentage === 1 ? '#10b981' : '#2196F3'} style={styles.materialProgress} />

                      {isAdminOrManager && m.quantity_issued < m.quantity_needed && (
                        <Button 
                          mode="contained" 
                          icon="package-variant-closed-plus"
                          onPress={() => triggerIssueModal(m)} 
                          style={styles.issueBtn}
                        >
                          Issue Stock
                        </Button>
                      )}
                    </Card.Content>
                  </Card>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'team' && (
          <View style={styles.sectionPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.tabSectionHeader}>Team Members</Text>
              {isAdminOrManager && (
                <Button mode="outlined" onPress={() => setModalVisible('team')} icon="plus">
                  Assign Member
                </Button>
              )}
            </View>

            {team.length === 0 ? (
              <Text style={styles.emptyText}>No team members assigned to project.</Text>
            ) : (
              team.map(t => (
                <Card style={styles.subCard} key={t.id}>
                  <Card.Content style={styles.subCardContent}>
                    <View style={styles.subInfo}>
                      <Text variant="titleMedium" style={styles.subName}>{t.member_name}</Text>
                      <Text variant="bodySmall" style={styles.subDesc}>Project Role: {t.role}</Text>
                    </View>
                    {isAdminOrManager && (
                      <IconButton icon="account-minus-outline" iconColor="#ef4444" size={20} onPress={() => handleTeamRemove(t.id)} />
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'payments' && (
          <View style={styles.sectionPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.tabSectionHeader}>Clients Payments Logs</Text>
              {isAdminOrManager && (
                <Button mode="outlined" onPress={() => setModalVisible('payment')} icon="plus">
                  Add Payment
                </Button>
              )}
            </View>

            {payments.length === 0 ? (
              <Text style={styles.emptyText}>No client payments registered yet.</Text>
            ) : (
              payments.map(p => (
                <Card style={styles.subCard} key={p.id}>
                  <Card.Content>
                    <View style={styles.paymentHeader}>
                      <Text variant="titleMedium" style={styles.paymentAmt}>+ ${p.amount.toLocaleString()}</Text>
                      <Text variant="bodySmall" style={styles.dateText}>{new Date(p.payment_date).toLocaleDateString()}</Text>
                    </View>
                    {p.notes ? <Text variant="bodySmall" style={styles.subDesc}>Justification: {p.notes}</Text> : null}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'files' && (
          <View style={styles.sectionPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.tabSectionHeader}>Files & Contracts</Text>
              <Button mode="outlined" onPress={() => setModalVisible('file')} icon="plus">
                Attach File
              </Button>
            </View>

            {files.length === 0 ? (
              <Text style={styles.emptyText}>No files attached.</Text>
            ) : (
              files.map(f => (
                <Card style={styles.subCard} key={f.id}>
                  <Card.Content style={styles.subCardContent}>
                    <View style={styles.subInfo}>
                      <Text variant="titleMedium" style={styles.subName}>{f.file_name}</Text>
                      <Text variant="bodySmall" style={styles.subDesc}>Type: {f.file_type}</Text>
                    </View>
                    <IconButton icon="file-download-outline" iconColor="#2196F3" size={24} onPress={() => showNotification('Simulating download...')} />
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'updates' && (
          <View style={styles.sectionPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={styles.tabSectionHeader}>Chronological Updates</Text>
              <Button mode="outlined" onPress={() => setModalVisible('update')} icon="plus">
                Add Note
              </Button>
            </View>

            {updates.length === 0 ? (
              <Text style={styles.emptyText}>No update notes logged yet.</Text>
            ) : (
              updates.map(u => (
                <Card style={styles.subCard} key={u.id}>
                  <Card.Content>
                    <View style={styles.updateHeader}>
                      <Text variant="titleSmall" style={styles.updateUser}>{u.user_name}</Text>
                      <Text variant="bodySmall" style={styles.dateText}>{new Date(u.created_at).toLocaleString()}</Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.updateNoteText}>{u.note}</Text>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Portal Dialogs Wrapper */}
      <Portal>
        {/* Service modal */}
        <Dialog visible={modalVisible === 'service'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Add Project Service</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Service Name" value={serviceName} onChangeText={setServiceName} mode="outlined" style={styles.modalInput} />
            <TextInput label="Estimated Cost" value={serviceCost} onChangeText={setServiceCost} keyboardType="numeric" mode="outlined" style={styles.modalInput} />
            <TextInput label="Description Details" value={serviceDesc} onChangeText={setServiceDesc} mode="outlined" multiline numberOfLines={3} style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={handleServiceSave} loading={actioning} disabled={actioning}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Phase modal */}
        <Dialog visible={modalVisible === 'phase'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Register Timeline Phase</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Phase Name (e.g. Excavation)" value={phaseName} onChangeText={setPhaseName} mode="outlined" style={styles.modalInput} />
            <TextInput label="Expected End Date (YYYY-MM-DD)" value={phaseEnd} onChangeText={setPhaseEnd} mode="outlined" placeholder="e.g. 2026-06-30" style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={handlePhaseSave} loading={actioning} disabled={actioning}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Material modal */}
        <Dialog visible={modalVisible === 'material'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Request Material Requirement</Dialog.Title>
          <Dialog.Content>
            <Button mode="outlined" onPress={() => setMaterialItemSearchOpen(!materialItemSearchOpen)} style={styles.modalPicker}>
              {materialItemId ? inventoryItems.find(i => i.id === materialItemId)?.item_name : 'Choose inventory item...'}
            </Button>
            {materialItemSearchOpen && (
              <ScrollView style={styles.modalSearchScroll}>
                {inventoryItems.map(item => (
                  <TouchableOpacity key={item.id} style={styles.modalSearchOption} onPress={() => { setMaterialItemId(item.id); setMaterialItemSearchOpen(false); }}>
                    <Text>{item.item_name} (SKU: {item.sku})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TextInput label="Quantity Needed (pcs)" value={materialQtyNeeded} onChangeText={setMaterialQtyNeeded} keyboardType="numeric" mode="outlined" style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={handleMaterialSave} loading={actioning} disabled={actioning}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Issue stock modal */}
        <Dialog visible={modalVisible === 'issue'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Issue Materials to Site</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.issueModalSubtitle}>Material: {selectedMaterial?.item_name}</Text>
            
            <Button mode="outlined" onPress={() => setIssueLocationPickerOpen(!issueLocationPickerOpen)} style={styles.modalPicker}>
              {issueLocationId ? locations.find(l => l.id === issueLocationId)?.name : 'Choose warehouse depot...'}
            </Button>
            
            {issueLocationPickerOpen && (
              <ScrollView style={styles.modalSearchScroll}>
                {itemLocations.filter(il => il.item_id === selectedMaterial?.item_id && il.quantity > 0).map(il => {
                  const locObj = locations.find(l => l.id === il.location_id);
                  return (
                    <TouchableOpacity key={il.id} style={styles.modalSearchOption} onPress={() => { setIssueLocationId(il.location_id); setIssueLocationPickerOpen(false); }}>
                      <Text>{locObj ? locObj.name : 'Depot'} (Available: {il.quantity} pcs)</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TextInput label="Quantity to Issue" value={issueQty} onChangeText={setIssueQty} keyboardType="numeric" mode="outlined" style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={executeIssueStock} loading={actioning} disabled={actioning}>Apply Issue</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Team member modal */}
        <Dialog visible={modalVisible === 'team'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Assign Team Member</Dialog.Title>
          <Dialog.Content>
            <Button mode="outlined" onPress={() => setTeamSearchOpen(!teamSearchOpen)} style={styles.modalPicker}>
              {teamMemberId ? users.find(u => u.id === teamMemberId)?.name : 'Choose Team Member...'}
            </Button>
            {teamSearchOpen && (
              <ScrollView style={styles.modalSearchScroll}>
                {users.map(u => (
                  <TouchableOpacity key={u.id} style={styles.modalSearchOption} onPress={() => { setTeamMemberId(u.id); setTeamSearchOpen(false); }}>
                    <Text>{u.name} ({u.role})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TextInput label="Project Role (e.g. Supervisor)" value={teamRole} onChangeText={setTeamRole} mode="outlined" style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={handleTeamSave} loading={actioning} disabled={actioning}>Assign</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Payment modal */}
        <Dialog visible={modalVisible === 'payment'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Log Client Payment</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Payment Amount ($)" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" mode="outlined" style={styles.modalInput} />
            <TextInput label="Justification Notes" value={paymentNotes} onChangeText={setPaymentNotes} mode="outlined" multiline numberOfLines={3} style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={handlePaymentSave} loading={actioning} disabled={actioning}>Register Payment</Button>
          </Dialog.Actions>
        </Dialog>

        {/* File modal */}
        <Dialog visible={modalVisible === 'file'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Attach File Record</Dialog.Title>
          <Dialog.Content>
            <TextInput label="File Title Name" value={fileName} onChangeText={setFileName} mode="outlined" style={styles.modalInput} />
            <TextInput label="File Classification Type (e.g. Blueprint)" value={fileType} onChangeText={setFileType} mode="outlined" style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={handleFileSave} loading={actioning} disabled={actioning}>Attach</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Update note modal */}
        <Dialog visible={modalVisible === 'update'} onDismiss={() => setModalVisible(null)}>
          <Dialog.Title>Add Update Note</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Note Details" value={updateNote} onChangeText={setUpdateNote} mode="outlined" multiline numberOfLines={4} style={styles.modalInput} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(null)}>Cancel</Button>
            <Button onPress={handleUpdateSave} loading={actioning} disabled={actioning}>Publish</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Feedback Snackbar */}
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
  headerSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  avatarIcon: {
    backgroundColor: '#2196F3',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  projTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  projCode: {
    color: '#94a3b8',
    marginTop: 2,
  },
  tabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabsScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#f1f5f9',
  },
  tabBtnSel: {
    backgroundColor: '#2196F3',
  },
  tabLabel: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 13,
  },
  tabLabelSel: {
    color: '#ffffff',
  },
  tabContent: {
    flex: 1,
  },
  sectionPadding: {
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
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'center',
  },
  specLabel: {
    fontWeight: 'bold',
    color: '#64748b',
    fontSize: 13,
  },
  specLabelDescription: {
    fontWeight: 'bold',
    color: '#64748b',
    fontSize: 13,
    marginTop: 12,
  },
  specVal: {
    color: '#0f172a',
  },
  descriptionText: {
    color: '#334155',
    lineHeight: 18,
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabSectionHeader: {
    color: '#475569',
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 40,
  },
  subCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  subCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subInfo: {
    flex: 1,
    marginRight: 10,
  },
  subName: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subDesc: {
    color: '#64748b',
    marginTop: 4,
  },
  subCost: {
    color: '#10b981',
    fontWeight: 'bold',
    marginTop: 6,
  },
  phaseBadge: {
    color: '#ffffff',
    fontWeight: 'bold',
    borderRadius: 4,
    paddingHorizontal: 8,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialQtyLabel: {
    color: '#475569',
    fontWeight: '500',
  },
  materialProgress: {
    height: 6,
    borderRadius: 3,
    marginVertical: 12,
  },
  issueBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#2196F3',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  paymentAmt: {
    fontWeight: 'bold',
    color: '#10b981',
  },
  dateText: {
    color: '#94a3b8',
  },
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  updateUser: {
    fontWeight: 'bold',
    color: '#334155',
  },
  updateNoteText: {
    color: '#0f172a',
    lineHeight: 18,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  modalPicker: {
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 12,
  },
  modalSearchScroll: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    marginBottom: 12,
  },
  modalSearchOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  issueModalSubtitle: {
    color: '#64748b',
    marginBottom: 12,
    fontSize: 13,
  },
});
