import { LayoutDashboard, Box, Scissors, GanttChart, Users, DollarSign, Factory, Settings, UserCog } from 'lucide-react';

export const modules = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'planning', name: 'Planeación', icon: Box, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'engineering', name: 'Ingeniería', icon: Scissors, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'programming', name: 'Programación', icon: GanttChart, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'inventory', name: 'Inventarios', icon: Factory, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'shop_floor_control', name: 'Control de Piso', icon: Settings, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'costs', name: 'Costos', icon: DollarSign, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'personnel', name: 'Personal', icon: Users, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
  { id: 'users', name: 'Usuarios', icon: UserCog, roles: ['SuperAdministrador', 'Administrador', 'Usuario'] },
];