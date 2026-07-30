export type NavigationIcon =
  | 'home'
  | 'handover'
  | 'inventory'
  | 'sales'
  | 'report';

export interface NavigationItem {
  id: string;
  label: string;
  icon: NavigationIcon;
  route: string;
}