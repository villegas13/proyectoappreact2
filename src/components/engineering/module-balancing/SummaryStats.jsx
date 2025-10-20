import React from 'react';
import { TrendingUp, TrendingDown, UserCheck } from 'lucide-react';

const StatCard = ({ icon, label, value, colorClass }) => (
  <div className="flex items-center gap-3">
    {React.cloneElement(icon, { className: `w-6 h-6 ${colorClass}` })}
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-bold text-lg">{value}</p>
    </div>
  </div>
);

const SummaryStats = ({ totalSAM, unitsPerHour, taktTime, requiredMachines, summaryStats }) => {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 mb-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">SAM Total</p>
          <p className="font-bold text-lg">{totalSAM.toFixed(4)} min</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Unidades/Hora</p>
          <p className="font-bold text-lg">{Math.round(unitsPerHour)}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Tiempo Medio (Takt)</p>
          <p className="font-bold text-lg">{taktTime.toFixed(4)} min</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Máquinas Requeridas</p>
          <p className="font-bold text-lg">{requiredMachines.toFixed(2)}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 mb-4 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <StatCard icon={<UserCheck />} label="Ocupación Promedio" value={`${summaryStats.average_occupancy.toFixed(1)}%`} colorClass="text-blue-400" />
        <StatCard icon={<TrendingUp />} label="Operario más Cargado" value={`${summaryStats.most_loaded.name} (${summaryStats.most_loaded.percentage.toFixed(1)}%)`} colorClass="text-red-400" />
        <StatCard icon={<TrendingDown />} label="Operario menos Cargado" value={`${summaryStats.least_loaded.name} (${summaryStats.least_loaded.percentage.toFixed(1)}%)`} colorClass="text-green-400" />
      </div>
    </>
  );
};

export default SummaryStats;