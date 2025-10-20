import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const date = new Date(label);
    const formattedDate = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
    return (
      <div className="p-3 rounded-lg shadow-lg" style={{ backgroundColor: 'var(--bg-popover)', border: '1px solid var(--border)' }}>
        <p className="font-bold text-popover-foreground">{formattedDate}</p>
        <p className="text-sm text-blue-500">{`Producción: ${payload[0].value} uds`}</p>
        <p className="text-sm text-green-500">{`Eficiencia: ${payload[1].value}%`}</p>
      </div>
    );
  }
  return null;
};

const ProductionChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      setLoading(true);
      const { data: chartData, error } = await supabase.rpc('get_weekly_performance');
      if (error) {
        console.error("Error fetching weekly performance:", error);
      } else {
        const formattedData = chartData.map(item => ({
          ...item,
          day_name: new Date(item.log_date).toLocaleDateString('es-ES', { weekday: 'short' }),
          average_efficiency: Math.round(item.average_efficiency * 100),
        }));
        setData(formattedData);
      }
      setLoading(false);
    };
    fetchWeeklyData();
  }, []);

  if (loading) {
    return (
      <div className="h-[350px] flex justify-center items-center p-6 rounded-xl card-shadow" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="p-6 rounded-xl card-shadow h-[350px]"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Rendimiento de Producción Semanal
      </h2>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day_name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <YAxis yAxisId="left" orientation="left" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} label={{ value: 'Unidades', angle: -90, position: 'insideLeft', fill: 'var(--text-secondary)' }} />
          <YAxis yAxisId="right" orientation="right" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} label={{ value: 'Eficiencia (%)', angle: 90, position: 'insideRight', fill: 'var(--text-secondary)' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}}/>
          <Bar yAxisId="left" dataKey="total_units_produced" name="Producción (uds)" fill="var(--color-blue-500)" barSize={30} />
          <Line yAxisId="right" type="monotone" dataKey="average_efficiency" name="Eficiencia" stroke="var(--color-green-500)" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default ProductionChart;