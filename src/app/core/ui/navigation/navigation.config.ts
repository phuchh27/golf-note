import { UserRole } from '../../auth/auth.types';
import { IconName } from '../icon/icon.types';

export interface NavigationItem {
  label: string;
  route: string;
  icon: IconName;
  roles?: UserRole[];
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Home', route: '/', icon: 'home' },
  { label: 'Handover', route: '/handover', icon: 'handover' },
  { label: 'Inventory', route: '/inventory', icon: 'inventory' },
  { label: 'Sales', route: '/sales', icon: 'sales' },
  { label: 'Reports', route: '/reports', icon: 'report' },
  { label: 'Archive', route: '/archive', icon: 'archive' },
  { label: 'Manager', route: '/manager', icon: 'manager', roles: ['ADMIN', 'MANAGER'] },
  { label: 'Admin', route: '/admin', icon: 'admin', roles: ['ADMIN','SUPER_ADMIN'] },
];