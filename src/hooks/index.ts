import { useState, useEffect } from 'react';
import { listenToData } from '../services/database';
import { 
  Item, 
  Category, 
  Supplier, 
  Location, 
  StockTransfer, 
  Project, 
  ProjectService,
  ProjectPhase,
  ProjectMaterial,
  ProjectTeamMember,
  ProjectPayment,
  ProjectUpdate,
  TeamMember 
} from '../types';

// Helper to convert Firebase object maps to arrays with ids
export function convertFirebaseObject<T>(obj: Record<string, T> | null): T[] {
  if (!obj) return [];
  return Object.entries(obj).map(([id, val]) => ({
    id,
    ...(val as any)
  }));
}

// 1. Core hook: useRealtimeData
export function useRealtimeData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    try {
      const unsub = listenToData<T>(path, (val) => {
        setData(val);
        setLoading(false);
      });
      return () => unsub();
    } catch (e: any) {
      setError(e.message || 'Error subscribing to realtime path.');
      setLoading(false);
    }
  }, [path]);

  return { data, loading, error };
}

// 2. useItems
export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToData<Record<string, Item>>('items', (data) => {
      setItems(convertFirebaseObject(data));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { items, loading, error };
}

// 3. useItem
export function useItem(id: string) {
  const { data: item, loading, error } = useRealtimeData<Item>(`items/${id}`);
  return { item, loading, error };
}

// 4. useCategories
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToData<Record<string, Category>>('categories', (data) => {
      setCategories(convertFirebaseObject(data));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { categories, loading, error };
}

// 5. useSuppliers
export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToData<Record<string, Supplier>>('suppliers', (data) => {
      setSuppliers(convertFirebaseObject(data));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { suppliers, loading, error };
}

// 6. useLocations
export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToData<Record<string, Location>>('locations', (data) => {
      setLocations(convertFirebaseObject(data));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { locations, loading, error };
}

// 7. useStockTransfers
export function useStockTransfers(statusFilter?: string) {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToData<Record<string, StockTransfer>>('stock_transfers', (data) => {
      const list = convertFirebaseObject(data).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      if (statusFilter && statusFilter !== 'all') {
        setTransfers(list.filter(t => t.status === statusFilter));
      } else {
        setTransfers(list);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [statusFilter]);

  return { transfers, loading, error };
}

// 8. useProjects
export function useProjects(statusFilter?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToData<Record<string, Project>>('projects', (data) => {
      const list = convertFirebaseObject(data);
      if (statusFilter && statusFilter !== 'all') {
        setProjects(list.filter(p => p.status === statusFilter));
      } else {
        setProjects(list);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [statusFilter]);

  return { projects, loading, error };
}

// 9. useProject - multi-resource project specs aggregator
export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [services, setServices] = useState<ProjectService[]>([]);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [team, setTeam] = useState<ProjectTeamMember[]>([]);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);

    const unsubProj = listenToData<Project>(`projects/${id}`, (projVal) => {
      setProject(projVal);
    });

    const unsubServices = listenToData<Record<string, ProjectService>>('project_services', (data) => {
      const list = convertFirebaseObject(data);
      setServices(list.filter(s => s.project_id === id));
    });

    const unsubPhases = listenToData<Record<string, ProjectPhase>>('project_phases', (data) => {
      const list = convertFirebaseObject(data);
      setPhases(list.filter(p => p.project_id === id));
    });

    const unsubMaterials = listenToData<Record<string, ProjectMaterial>>('project_materials', (data) => {
      const list = convertFirebaseObject(data);
      setMaterials(list.filter(m => m.project_id === id));
    });

    const unsubTeam = listenToData<Record<string, ProjectTeamMember>>('project_team_members', (data) => {
      const list = convertFirebaseObject(data);
      setTeam(list.filter(t => t.project_id === id));
    });

    const unsubPayments = listenToData<Record<string, ProjectPayment>>('project_payments', (data) => {
      const list = convertFirebaseObject(data);
      setPayments(list.filter(p => p.project_id === id));
    });

    const unsubUpdates = listenToData<Record<string, ProjectUpdate>>('project_updates', (data) => {
      const list = convertFirebaseObject(data);
      setUpdates(
        list.filter(u => u.project_id === id).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setLoading(false);
    });

    return () => {
      unsubProj();
      unsubServices();
      unsubPhases();
      unsubMaterials();
      unsubTeam();
      unsubPayments();
      unsubUpdates();
    };
  }, [id]);

  return {
    project,
    services,
    phases,
    materials,
    team,
    payments,
    updates,
    loading,
    error
  };
}

// 10. useTeamMembers
export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenToData<Record<string, TeamMember>>('team_members', (data) => {
      setMembers(convertFirebaseObject(data));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { members, loading, error };
}

// 11. useDashboardStats
export function useDashboardStats() {
  const [loading, setLoading] = useState(true);

  // States
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
  const [totalTeamMembers, setTotalTeamMembers] = useState(0);

  useEffect(() => {
    const unsubItems = listenToData<Record<string, Item>>('items', (data) => {
      const itemsList = convertFirebaseObject(data);
      setTotalItems(itemsList.length);
      setLowStockCount(itemsList.filter(i => i.quantity <= i.reorder_level && i.quantity > 0).length);
      setOutOfStockCount(itemsList.filter(i => i.quantity <= 0).length);
    });

    const unsubProjects = listenToData<Record<string, Project>>('projects', (data) => {
      const list = convertFirebaseObject(data);
      setActiveProjects(list.filter(p => p.status === 'Active').length);
    });

    const unsubTransfers = listenToData<Record<string, StockTransfer>>('stock_transfers', (data) => {
      const list = convertFirebaseObject(data);
      setPendingTransfers(list.filter(t => t.status === 'Pending').length);
    });

    const unsubSuppliers = listenToData<Record<string, Supplier>>('suppliers', (data) => {
      setTotalSuppliers(Object.keys(data || {}).length);
    });

    const unsubMembers = listenToData<Record<string, TeamMember>>('team_members', (data) => {
      setTotalTeamMembers(Object.keys(data || {}).length);
      setLoading(false);
    });

    return () => {
      unsubItems();
      unsubProjects();
      unsubTransfers();
      unsubSuppliers();
      unsubMembers();
    };
  }, []);

  return {
    totalItems,
    lowStockCount,
    outOfStockCount,
    activeProjects,
    pendingTransfers,
    totalSuppliers,
    totalTeamMembers,
    loading
  };
}
