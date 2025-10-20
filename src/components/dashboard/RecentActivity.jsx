import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

const recentActivityData = [
  { id: 1, type: 'success', message: 'Nueva orden de producción creada', time: 'Hace 2 horas' },
  { id: 2, type: 'info', message: 'Cliente nuevo registrado: Textiles ABC', time: 'Hace 4 horas' },
  { id: 3, type: 'warning', message: 'Stock bajo en material: Algodón Premium', time: 'Hace 6 horas' },
  { id: 4, type: 'success', message: 'Orden de producción completada', time: 'Hace 8 horas' },
];

const RecentActivity = () => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'success': return <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0 mt-1.5"></div>;
      case 'warning': return <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 flex-shrink-0 mt-1.5"></div>;
      case 'info': return <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5"></div>;
      default: return <div className="w-2.5 h-2.5 rounded-full bg-gray-500 flex-shrink-0 mt-1.5"></div>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="p-6 rounded-xl card-shadow col-span-1 lg:col-span-1"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Actividad Reciente
      </h2>
      <div className="space-y-4">
        {recentActivityData.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className="flex items-start space-x-3"
          >
            {getActivityIcon(activity.type)}
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {activity.message}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {activity.time}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default RecentActivity;