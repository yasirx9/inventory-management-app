// Centralized Type definitions for EIH Inventory Management System

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  department: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Item {
  id: string;
  item_name: string;
  sku: string;
  category: string;
  description: string;
  quantity: number;
  reorder_level: number;
  location: string;
  supplier: string;
  cost: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  created_at: string;
  location_breakdown?: LocationBreakdown[];
}

export interface LocationBreakdown {
  location_id: string;
  location_name: string;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface ItemLocation {
  id: string;
  item_id: string;
  location_id: string;
  quantity: number;
}

export interface StockMovement {
  id: string;
  item_id: string;
  item_name: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  from_location?: string;
  to_location?: string;
  notes: string;
  user_id: string;
  created_at: string;
}

export interface StockTransfer {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location_id: string;
  from_location_name: string;
  to_location_id: string;
  to_location_name: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Receipt Rejected';
  requested_by: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  received_by?: string;
  received_at?: string;
  created_at: string;
}

export interface Project {
  id: string;
  project_code: string;
  name: string;
  description: string;
  client_name: string;
  client_contact: string;
  client_email: string;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  start_date: string;
  end_date: string;
  actual_end_date?: string;
  budget: number;
  actual_cost: number;
  manager_id: string;
  manager_name?: string;
  notes: string;
  created_at: string;
}

export interface ProjectService {
  id: string;
  project_id: string;
  service_name: string;
  description: string;
  cost: number;
}

export interface ProjectPhase {
  id: string;
  project_id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface ProjectMaterial {
  id: string;
  project_id: string;
  item_id: string;
  item_name: string;
  quantity_needed: number;
  quantity_issued: number;
}

export interface ProjectPayment {
  id: string;
  project_id: string;
  amount: number;
  payment_date: string;
  notes: string;
}

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  member_id: string;
  member_name: string;
  role: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  note: string;
  user_id: string;
  user_name: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  iqama_number?: string;
  iqama_expiry?: string;
  passport_number?: string;
  passport_expiry?: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: any;
}

// --- Legacy / Generic Utility Interfaces ---

// Legacy alias for compatibility
export interface InventoryItem extends Item {
  name: string;
  price?: number;
  lastUpdated: Date;
}

// Generic API response structure
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination parameters
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_type: string;
  file_size?: string;
  created_at: string;
}
