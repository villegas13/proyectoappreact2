import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Activity, CheckCircle } from 'lucide-react';

const productionStatusData = [
  { title: 'Órdenes Pendientes', value: '23', color: 'yellow', icon: Clock },
  { title: 'En Proceso', value: '45', color: 'blue', icon: Activity },
  { title: 'Completadas', value: '156', color: 'green', icon: CheckCircle },
];

const ProductionStatus = () => {

  const getIcon = (item) => {
    const Icon = item.icon;
    const colors = {
      yellow: 'text-yellow-500',
      blue: 'text-blue-500',
      green: 'text-green-500',
    }
    return <Icon className={`w-5 h-5 ${colors[item.color]}`}/>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-6 rounded-xl card-shadow"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Estado de Producción
      </h2>
      <div className="grid grid-cols-3 gap-4">
        {productionStatusData.map((status, index) => (
          <div key={index} className="flex flex-col items-center justify-center p-4 rounded-lg" style={{backgroundColor: 'var(--bg-primary)'}}>
            {getIcon(status)}
            <p className="text-2xl font-bold mt-2" style={{color: 'var(--text-primary)'}}>{status.value}</p>
            <p className="text-xs text-center" style={{color: 'var(--text-secondary)'}}>{status.title}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProductionStatus;