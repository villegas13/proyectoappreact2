import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Factory, Zap, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const EfficiencyIndicator = ({ efficiency }) => {
  if (efficiency === null || isNaN(efficiency)) {
    return <div className="text-center font-semibold">-</div>;
  }

  const value = Math.round(efficiency * 100);
  const colorClass =
    value >= 95
      ? 'text-green-500'
      : value >= 80
      ? 'text-yellow-500'
      : 'text-red-500';

  return (
    <div className={cn('flex items-center justify-end gap-1 font-bold', colorClass)}>
      <Zap className="w-4 h-4" />
      <span>{value}%</span>
    </div>
  );
};

const ActiveWorkstations = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchActiveStations = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_active_workstations_status');
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar las estaciones activas.',
        });
        console.error(error);
      } else {
        setStations(data);
      }
      setLoading(false);
    };

    fetchActiveStations();

    const channel = supabase
      .channel('active-stations-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_timers' }, fetchActiveStations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-6 rounded-xl card-shadow h-full"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Estaciones de Trabajo Activas
      </h2>
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : stations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <CheckCircle className="mx-auto h-10 w-10 mb-2" />
            <p>No hay estaciones de trabajo activas.</p>
          </div>
        ) : (
          stations.map((station, index) => (
            <motion.div
              key={station.workstation_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className="p-3 rounded-lg border flex items-center justify-between"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <Factory className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-semibold text-sm">{station.workstation_name}</p>
                  <p className="text-xs text-muted-foreground">{station.order_code}</p>
                </div>
              </div>
              <EfficiencyIndicator efficiency={station.current_efficiency} />
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default ActiveWorkstations;