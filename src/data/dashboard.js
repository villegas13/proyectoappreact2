import { Users, UserPlus, Package, DollarSign, Activity } from 'lucide-react';

export const dashboardStats = [
  {
    title: 'Usuarios Activos',
    value: '124',
    change: '+5% vs mes anterior',
    color: 'blue',
    icon: Users
  },
   {
    title: 'Clientes',
    value: '89',
    change: '+12% vs mes anterior',
    color: 'green',
    icon: UserPlus
  },
  {
    title: 'Productos',
    value: '1,247',
    change: '-2% vs mes anterior',
    color: 'purple',
    icon: Package
  },
  {
    title: 'Ventas Totales',
    value: '$45,890',
    change: '+18% vs mes anterior',
    color: 'orange',
    icon: DollarSign
  }
];