import { NavigatorScreenParams } from '@react-navigation/native';

// Parameter lists for each stack navigator
export type AuthStackParamList = {
  Login: undefined;
};

export type HomeStackParamList = {
  DashboardScreen: undefined;
};

export type InventoryStackParamList = {
  InventoryList: undefined;
  InventoryDetail: { itemId: string };
  InventoryCreateEdit: { itemId?: string }; // undefined means Create mode
};

export type ProjectStackParamList = {
  ProjectList: undefined;
  ProjectDetail: { projectId: string };
  ProjectCreateEdit: { projectId?: string }; // undefined means Create mode
};

export type TransferStackParamList = {
  TransferList: undefined;
  TransferCreate: undefined;
  TransferDetail: { transferId: string };
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Categories: undefined;
  CategoryForm: { categoryId?: string };
  Suppliers: undefined;
  SupplierForm: { supplierId?: string };
  Locations: undefined;
  LocationForm: { locationId?: string };
  TeamMembers: undefined;
  TeamMemberDetail: { memberId: string };
  TeamMemberForm: { memberId?: string };
  Reports: undefined;
  Settings: undefined; // Original SettingsScreen
  Users: undefined;
  UserForm: { userId?: string };
};

// Bottom Tab Navigator parameters
export type BottomTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  InventoryTab: NavigatorScreenParams<InventoryStackParamList>;
  ProjectsTab: NavigatorScreenParams<ProjectStackParamList>;
  TransfersTab: NavigatorScreenParams<TransferStackParamList>;
  MoreTab: NavigatorScreenParams<MoreStackParamList>;
};

// Root Stack parameters
export type RootStackParamList = {
  AuthStack: NavigatorScreenParams<AuthStackParamList>;
  MainStack: NavigatorScreenParams<BottomTabParamList>;
};
