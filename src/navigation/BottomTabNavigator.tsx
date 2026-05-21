import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';

// Import Types
import { 
  BottomTabParamList, 
  HomeStackParamList, 
  InventoryStackParamList, 
  ProjectStackParamList, 
  TransferStackParamList, 
  MoreStackParamList 
} from './types';

// Import Screens
import DashboardScreen from '../screens/DashboardScreen';
import InventoryListScreen from '../screens/inventory/InventoryListScreen';
import InventoryDetailScreen from '../screens/inventory/InventoryDetailScreen';
import InventoryFormScreen from '../screens/inventory/InventoryFormScreen';
import ProjectListScreen from '../screens/projects/ProjectListScreen';
import ProjectDetailScreen from '../screens/projects/ProjectDetailScreen';
import ProjectCreateEditScreen from '../screens/projects/ProjectFormScreen';
import TransferListScreen from '../screens/transfers/TransferListScreen';
import TransferCreateScreen from '../screens/transfers/TransferCreateScreen';
import TransferDetailScreen from '../screens/transfers/TransferDetailScreen';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import CategoryListScreen from '../screens/categories/CategoryListScreen';
import CategoryFormScreen from '../screens/categories/CategoryFormScreen';
import SupplierListScreen from '../screens/suppliers/SupplierListScreen';
import SupplierFormScreen from '../screens/suppliers/SupplierFormScreen';
import LocationListScreen from '../screens/locations/LocationListScreen';
import LocationFormScreen from '../screens/locations/LocationFormScreen';
import TeamMemberListScreen from '../screens/team/TeamMemberListScreen';
import TeamMemberDetailScreen from '../screens/team/TeamMemberDetailScreen';
import TeamMemberFormScreen from '../screens/team/TeamMemberFormScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UserListScreen from '../screens/users/UserListScreen';
import UserFormScreen from '../screens/users/UserFormScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

// --- Tab-Specific Stack Navigators ---

const HomeStack = createStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerTintColor: '#1E3A8A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <HomeStack.Screen 
        name="DashboardScreen" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard' }} 
      />
    </HomeStack.Navigator>
  );
}

const InventoryStack = createStackNavigator<InventoryStackParamList>();
function InventoryStackNavigator() {
  return (
    <InventoryStack.Navigator
      screenOptions={{
        headerTintColor: '#1E3A8A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <InventoryStack.Screen 
        name="InventoryList" 
        component={InventoryListScreen} 
        options={{ title: 'Inventory Ledger' }} 
      />
      <InventoryStack.Screen 
        name="InventoryDetail" 
        component={InventoryDetailScreen} 
        options={{ title: 'Item details' }} 
      />
      <InventoryStack.Screen 
        name="InventoryCreateEdit" 
        component={InventoryFormScreen} 
        options={({ route }) => ({ 
          title: route.params?.itemId ? 'Edit Item' : 'New Item' 
        })} 
      />
    </InventoryStack.Navigator>
  );
}

const ProjectStack = createStackNavigator<ProjectStackParamList>();
function ProjectStackNavigator() {
  return (
    <ProjectStack.Navigator
      screenOptions={{
        headerTintColor: '#1E3A8A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <ProjectStack.Screen 
        name="ProjectList" 
        component={ProjectListScreen} 
        options={{ title: 'Contract Projects' }} 
      />
      <ProjectStack.Screen 
        name="ProjectDetail" 
        component={ProjectDetailScreen} 
        options={{ title: 'Project Details' }} 
      />
      <ProjectStack.Screen 
        name="ProjectCreateEdit" 
        component={ProjectCreateEditScreen} 
        options={({ route }) => ({ 
          title: route.params?.projectId ? 'Edit Project' : 'New Project' 
        })} 
      />
    </ProjectStack.Navigator>
  );
}

const TransferStack = createStackNavigator<TransferStackParamList>();
function TransferStackNavigator() {
  return (
    <TransferStack.Navigator
      screenOptions={{
        headerTintColor: '#1E3A8A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <TransferStack.Screen 
        name="TransferList" 
        component={TransferListScreen} 
        options={{ title: 'Stock Transfers' }} 
      />
      <TransferStack.Screen 
        name="TransferCreate" 
        component={TransferCreateScreen} 
        options={{ title: 'Request Transit' }} 
      />
      <TransferStack.Screen 
        name="TransferDetail" 
        component={TransferDetailScreen} 
        options={{ title: 'Transit Specifications' }} 
      />
    </TransferStack.Navigator>
  );
}

const MoreStack = createStackNavigator<MoreStackParamList>();
function MoreStackNavigator() {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerTintColor: '#1E3A8A',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <MoreStack.Screen 
        name="MoreMenu" 
        component={MoreMenuScreen} 
        options={{ title: 'System Menu' }} 
      />
      <MoreStack.Screen 
        name="Categories" 
        component={CategoryListScreen} 
        options={{ title: 'Categories' }} 
      />
      <MoreStack.Screen 
        name="CategoryForm" 
        component={CategoryFormScreen} 
        options={({ route }) => ({ 
          title: route.params?.categoryId ? 'Edit Category' : 'New Category' 
        })} 
      />
      <MoreStack.Screen 
        name="Suppliers" 
        component={SupplierListScreen} 
        options={{ title: 'Suppliers' }} 
      />
      <MoreStack.Screen 
        name="SupplierForm" 
        component={SupplierFormScreen} 
        options={({ route }) => ({ 
          title: route.params?.supplierId ? 'Edit Supplier' : 'New Supplier' 
        })} 
      />
      <MoreStack.Screen 
        name="Locations" 
        component={LocationListScreen} 
        options={{ title: 'Locations' }} 
      />
      <MoreStack.Screen 
        name="LocationForm" 
        component={LocationFormScreen} 
        options={({ route }) => ({ 
          title: route.params?.locationId ? 'Edit Location' : 'New Location' 
        })} 
      />
      <MoreStack.Screen 
        name="TeamMembers" 
        component={TeamMemberListScreen} 
        options={{ title: 'Team Members' }} 
      />
      <MoreStack.Screen 
        name="TeamMemberDetail" 
        component={TeamMemberDetailScreen} 
        options={{ title: 'Member Profile' }} 
      />
      <MoreStack.Screen 
        name="TeamMemberForm" 
        component={TeamMemberFormScreen} 
        options={({ route }) => ({ 
          title: route.params?.memberId ? 'Edit Profile' : 'Add Team Member' 
        })} 
      />
      <MoreStack.Screen 
        name="Reports" 
        component={ReportsScreen} 
        options={{ title: 'Reports Audit' }} 
      />
      <MoreStack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'App Settings' }} 
      />
      <MoreStack.Screen 
        name="Users" 
        component={UserListScreen} 
        options={{ title: 'User Permissions' }} 
      />
      <MoreStack.Screen 
        name="UserForm" 
        component={UserFormScreen} 
        options={({ route }) => ({ 
          title: route.params?.userId ? 'Edit User Credentials' : 'Add New User' 
        })} 
      />
    </MoreStack.Navigator>
  );
}

// --- Main Tab Navigation Assembly ---

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#94a3b8',
        headerShown: false,
        tabBarStyle: {
          borderTopColor: '#e2e8f0',
          backgroundColor: '#ffffff',
          paddingBottom: 4,
          height: 54,
        }
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="InventoryTab"
        component={InventoryStackNavigator}
        options={{
          tabBarLabel: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="cubes" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectStackNavigator}
        options={{
          tabBarLabel: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="briefcase" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TransfersTab"
        component={TransferStackNavigator}
        options={{
          tabBarLabel: 'Transfers',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="exchange" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStackNavigator}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="bars" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
