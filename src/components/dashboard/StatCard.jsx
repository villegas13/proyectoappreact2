import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ item, index }) => {
  const Icon = item.icon;

  const colorClasses = {
    blue: {
      bg: 'bg-accent-blue-light dark:bg-accent-blue-light',
      text: 'text-blue-500 dark:text-blue-400'
    },
    green: {
      bg: 'bg-accent-green-light dark:bg-accent-green-light',
      text: 'text-green-500 dark:text-green-400'
    },
    purple: {
      bg: 'bg-accent-purple-light dark:bg-accent-purple-light',
      text: 'text-purple-500 dark:text-purple-400'
    },
    orange: {
      bg: 'bg-accent-orange-light dark:bg-accent-orange-light',
      text: 'text-orange-500 dark:text-orange-400'
    },
    yellow: {
      bg: 'bg-accent-orange-light dark:bg-accent-orange-light',
      text: 'text-yellow-500 dark:text-yellow-400'
    },
  };

  const { bg, text } = colorClasses[item.color] || colorClasses.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="p-5 rounded-xl card-shadow flex flex-col justify-between"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {item.title}
          </p>
          <div className="text-3xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {item.value}
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon className={`w-5 h-5 ${text}`} />
        </div>
      </div>
      {item.change && (
        <div className="flex items-center text-xs mt-4" style={{ color: 'var(--text-secondary)' }}>
          <span>{item.change}</span>
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;