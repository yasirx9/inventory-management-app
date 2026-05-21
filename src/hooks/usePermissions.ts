import { useAuth } from '../context/AuthContext';
import { canDo } from '../utils/permissions';

export function usePermissions() {
  const { userProfile } = useAuth();
  
  const can = (action: string): boolean => {
    return canDo(action, userProfile?.role);
  };

  return { can };
}
