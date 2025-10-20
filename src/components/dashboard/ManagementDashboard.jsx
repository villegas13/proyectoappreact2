import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import StatCard from '@/components/dashboard/StatCard';
import ProductionChart from '@/components/dashboard/ProductionChart';
import { DollarSign, Package, TrendingUp, BarChart, Loader2 } from 'lucide-react';

const ManagementDashboard = ({ userName }) => {
  const [stats, setStats] = useState({
    monthlyProduction: 0,
    avgCostPerUnit: 0,
    globalProductivity: 0,
    grossProfit: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManagementStats = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_management_dashboard_stats');
      if (error) {
        console.error("Error fetching management dashboard stats:", error);
      } else if (data && data.length > 0) {
        const result = data[0];
        setStats({
          monthlyProduction: result.monthly_production_units || 0,
          avgCostPerUnit: result.avg_cost_per_unit ? parseFloat(result.avg_cost_per_unit).toFixed(2) : '0.00',
          globalProductivity: result.global_productivity ? Math.round(result.global_productivity * 100) : 0,
          grossProfit: result.gross_profit_monthly ? parseFloat(result.gross_profit_monthly) : 0,
        });
      }
      setLoading(false);
    };

    fetchManagementStats();
  }, []);

  const formatCurrency = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const managementStats = [
    {
      title: 'Producción Mensual',
      value: loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.monthlyProduction} uds`,
      change: 'Unidades en el mes actual',
      color: 'blue',
      icon: Package
    },
    {
      title: 'Costo/Unidad Promedio',
      value: loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `$${stats.avgCostPerUnit}`,
      change: 'Costo real por unidad',
      color: 'green',
      icon: DollarSign
    },
    {
      title: 'Productividad Global',
      value: loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats.globalProductivity}%`,
      change: 'Eficiencia general del mes',
      color: 'purple',
      icon: TrendingUp
    },
    {
      title: 'Utilidad Bruta (Mes)',
      value: loading ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(stats.grossProfit),
      change: 'Estimación mensual',
      color: 'orange',
      icon: BarChart
    },
  ];

  return (
    <>
      <div className="text-center mb-4">
        <h2 className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
          Bienvenido, {userName} (Gerencia)
        </h2>
        <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
          Panel de Control Estratégico - {new Date().toLocaleDateString('es-ES', { 
            month: 'long', year: 'numeric' 
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {managementStats.map((stat, index) => (
          <StatCard key={stat.title} item={stat} index={index} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ProductionChart />
        <div className="p-6 rounded-xl card-shadow" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Top 3 Productos Rentables</h3>
          {/* Placeholder for top products */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--bg-primary)'}}><span>Camisa Polo Piqué</span><span className="font-bold text-green-500">+$15.2K</span></div>
            <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--bg-primary)'}}><span>Jean Slim Fit</span><span className="font-bold text-green-500">+$12.8K</span></div>
            <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--bg-primary)'}}><span>Chaqueta Bomber</span><span className="font-bold text-green-500">+$9.7K</span></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManagementDashboard;