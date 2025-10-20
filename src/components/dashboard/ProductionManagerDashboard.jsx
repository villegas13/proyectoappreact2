import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import ActiveProductionOrders from '@/components/dashboard/ActiveProductionOrders';
import ActiveWorkstations from '@/components/dashboard/ActiveWorkstations';
import ProductionChart from '@/components/dashboard/ProductionChart';
import StatCard from '@/components/dashboard/StatCard';
import { Zap, Target, AlertTriangle, Package, Loader2 } from 'lucide-react';

const ProductionManagerDashboard = ({ userName }) => {
  const [stats, setStats] = useState({
    dailyProduction: 0,
    globalEfficiency: 0,
    totalStops: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_dashboard_production_stats');
      if (error) {
        console.error("Error fetching dashboard stats:", error);
      } else if (data && data.length > 0) {
        const result = data[0];
        setStats({
          dailyProduction: result.daily_production_units || 0,
          globalEfficiency: result.global_efficiency ? Math.round(result.global_efficiency * 100) : 0,
          totalStops: result.total_stops || 0,
        });
      }
      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const productionManagerStats = [
    {
      title: 'Producción del Día (Empaque)',
      value: loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.dailyProduction} uds`,
      change: 'Unidades finalizadas hoy',
      color: 'blue',
      icon: Package
    },
    {
      title: 'Eficiencia Global',
      value: loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.globalEfficiency}%`,
      change: 'Rendimiento de planta hoy',
      color: 'green',
      icon: Zap
    },
    {
      title: 'Paradas Hoy',
      value: loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.totalStops}`,
      change: 'Estaciones detenidas',
      color: 'orange',
      icon: AlertTriangle
    },
  ];

  return (
    <>
      <div className="text-center mb-4">
        <h2 className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
          ¡Hola, {userName}! (Jefe de Producción)
        </h2>
        <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
          Panel de Control en Tiempo Real - {new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {productionManagerStats.map((stat, index) => (
          <StatCard key={stat.title} item={stat} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <ActiveProductionOrders />
          <ProductionChart />
        </div>
        <div className="lg:col-span-1">
          <ActiveWorkstations />
        </div>
      </div>
    </>
  );
};

export default ProductionManagerDashboard;