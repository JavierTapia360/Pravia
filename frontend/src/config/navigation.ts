import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  Building2,
  Calendar,
  FileText,
  FolderOpen,
  Home,
  UserSquare2,
  Users,
  Wallet,
} from 'lucide-react';

export type AppRole = 'DIRECCION' | 'ADMINISTRACION' | 'ABOGADO' | 'RECEPCION' | 'GESTORIA';

export interface NavigationItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles: AppRole[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

const ALL_ROLES: AppRole[] = ['DIRECCION', 'ADMINISTRACION', 'ABOGADO', 'RECEPCION', 'GESTORIA'];
const LEGAL_ROLES: AppRole[] = ['DIRECCION', 'ADMINISTRACION', 'ABOGADO', 'GESTORIA'];
const MANAGEMENT_ROLES: AppRole[] = ['DIRECCION', 'ADMINISTRACION'];

export const navigationGroups: NavigationGroup[] = [
  {
    label: 'Inicio',
    items: [
      { to: '/mi-dia', label: 'Mi Día', description: 'Prioridades y actividad diaria', icon: Home, roles: ALL_ROLES },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: '/prospectos', label: 'Prospectos', description: 'Contactos y seguimiento comercial', icon: Users, roles: ['DIRECCION', 'ADMINISTRACION', 'ABOGADO', 'RECEPCION'] },
      { to: '/cotizaciones', label: 'Cotizaciones', description: 'Presupuestos y aceptación', icon: FileText, roles: ['DIRECCION', 'ADMINISTRACION', 'ABOGADO', 'RECEPCION'] },
      { to: '/expedientes', label: 'Expedientes', description: 'Centro operativo jurídico', icon: FolderOpen, roles: LEGAL_ROLES },
      { to: '/comparecientes', label: 'Comparecientes', description: 'Personas, perfiles y documentos', icon: UserSquare2, roles: ALL_ROLES },
      { to: '/notarias', label: 'Notarías', description: 'Directorio y coordinación notarial', icon: Building2, roles: ALL_ROLES },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { to: '/agenda', label: 'Agenda', description: 'Citas, firmas y vencimientos', icon: Calendar, roles: ALL_ROLES },
      { to: '/finanzas', label: 'Finanzas', description: 'Cobranza, egresos y honorarios', icon: Wallet, roles: MANAGEMENT_ROLES },
      { to: '/reportes', label: 'Reportes', description: 'Indicadores de operación', icon: BarChart3, roles: MANAGEMENT_ROLES },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/inteligencia', label: 'Inteligencia', description: 'Asistencia documental y operativa', icon: BrainCircuit, roles: LEGAL_ROLES },
      { to: '/riesgos', label: 'Riesgos / UIF', description: 'Alertas y cumplimiento', icon: AlertTriangle, roles: ['DIRECCION', 'ADMINISTRACION', 'ABOGADO'] },
    ],
  },
];

export const roleLabels: Record<AppRole, string> = {
  DIRECCION: 'Dirección',
  ADMINISTRACION: 'Administración',
  ABOGADO: 'Abogado',
  RECEPCION: 'Recepción',
  GESTORIA: 'Gestoría',
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && value in roleLabels;
}

export function navigationForRole(role: unknown): NavigationGroup[] {
  const safeRole: AppRole = isAppRole(role) ? role : 'RECEPCION';
  return navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(safeRole)) }))
    .filter((group) => group.items.length > 0);
}
