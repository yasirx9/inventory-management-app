export const PERMISSIONS: Record<string, string[]> = {
  // Items
  'items.create': ['admin', 'manager'],
  'items.edit': ['admin', 'manager'],
  'items.delete': ['admin'],
  'items.adjust_quantity': ['admin', 'manager'],
  // Categories, Suppliers, Locations
  'categories.manage': ['admin', 'manager'],
  'suppliers.manage': ['admin', 'manager'],
  'locations.manage': ['admin'],
  // Transfers
  'transfers.create': ['admin', 'manager', 'staff'],
  'transfers.approve': ['admin', 'manager'],
  'transfers.confirm_receipt': ['admin', 'manager', 'staff'],
  // Projects
  'projects.create': ['admin', 'manager'],
  'projects.edit': ['admin', 'manager'],
  'projects.delete': ['admin'],
  'projects.issue_material': ['admin', 'manager'],
  // Users
  'users.manage': ['admin'],
  // Reports
  'reports.view': ['admin', 'manager'],
  // Settings
  'settings.edit': ['admin'],
  // Team Members
  'team_members.manage': ['admin', 'manager'],
};

export function canDo(action: string, role?: string): boolean {
  if (!role) return false;
  const allowedRoles = PERMISSIONS[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}
