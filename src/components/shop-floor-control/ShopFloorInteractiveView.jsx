import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import WorkstationCard from '@/components/shop-floor-control/WorkstationCard';
import { Loader2 } from 'lucide-react';

const ShopFloorInteractiveView = () => {
  const [workstations, setWorkstations] = useState([]);
  const [productionTimers, setProductionTimers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    // Don't set loading to true on refetch to avoid UI flicker
    const { data: workstationsData, error: workstationsError } = await supabase
      .from('workstations')
      .select('*, processes(name)')
      .order('name');

    if (workstationsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las estaciones de trabajo.' });
    } else {
      setWorkstations(workstationsData);
    }

    const { data: timersData, error: timersError } = await supabase
      .from('production_timers')
      .select(`
        *,
        production_orders(code, total_quantity, product_id, status, products(name, reference)),
        production_timer_employees(employee_id, employees(full_name))
      `)
      .in('status', ['En Progreso', 'Pausado']);

    if (timersError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los registros de producción.' });
    } else {
      setProductionTimers(timersData);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('shop-floor-interactive-view-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_timers' }, (payload) => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, (payload) => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_timer_employees' }, (payload) => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'non_conformities' }, (payload) => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className="text-muted-foreground">Cargando estaciones de trabajo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      {workstations.map((ws) => {
        const activeTimer = productionTimers.find(
          (timer) => timer.workstation_id === ws.id
        );
        return (
          <WorkstationCard
            key={ws.id}
            workstation={ws}
            activeTimer={activeTimer}
            onUpdate={fetchData}
          />
        );
      })}
    </div>
  );
};

export default ShopFloorInteractiveView;