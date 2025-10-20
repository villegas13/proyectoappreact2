import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, TrendingUp, Package, Target, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

const ProcessProgressCard = ({ process, totalQuantity }) => {
  const progressPercentage = totalQuantity > 0 ? (process.produced_units / totalQuantity) * 100 : 0;
  const efficiency = process.efficiency || 0;

  return (
    <div className="p-4 rounded-lg bg-tertiary space-y-3">
      <h4 className="font-semibold text-text-primary">{process.process_name}</h4>
      <Progress value={progressPercentage} className="h-2" />
      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <p className="font-bold text-lg text-accent-blue">{process.produced_units}</p>
          <p className="text-xs text-muted-foreground">Producido</p>
        </div>
        <div>
          <p className="font-bold text-lg text-text-secondary">{process.pending_units}</p>
          <p className="text-xs text-muted-foreground">Saldo</p>
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: efficiency > 80 ? 'var(--accent-green)' : efficiency > 50 ? 'var(--accent-orange)' : 'var(--destructive)' }}>
            {efficiency.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">Eficiencia</p>
        </div>
      </div>
    </div>
  );
};

const ProductionProgressView = () => {
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProgressData = useCallback(async () => {
    setLoading(true);
    
    const { data, error } = await supabase.rpc('get_production_progress_summary', {
      p_status: 'En Proceso'
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el avance de las OPs activas.' });
      console.error(error);
    } else {
      setProgressData(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProgressData();
  }, [fetchProgressData]);

  useEffect(() => {
    const channel = supabase
      .channel('progress-view-realtime-active')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, () => {
        fetchProgressData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'production_orders' }, (payload) => {
        if(payload.old.status !== payload.new.status) {
            fetchProgressData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProgressData]);

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
          </motion.div>
        )}
        {!loading && progressData.length > 0 && (
          <div className="space-y-8">
            {progressData.map((orderData, idx) => (
              <motion.div
                key={orderData.order_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="p-6 rounded-xl card-shadow bg-secondary"
              >
                <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-accent-blue">{orderData.order_code}</h2>
                    <p className="text-muted-foreground flex items-center gap-2"><Package className="h-4 w-4" />{orderData.product_name}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="font-bold text-2xl text-text-primary flex items-center gap-2">
                      <Target className="h-6 w-6" />
                      {orderData.total_quantity}
                    </p>
                    <p className="text-sm text-muted-foreground">Unidades Totales de la OP</p>
                  </div>
                   <div className="text-left md:text-right">
                    <p className="font-bold text-2xl text-accent-green flex items-center gap-2">
                      <CheckCircle className="h-6 w-6" />
                      {orderData.processes.reduce((sum, p) => sum + p.produced_units, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Producido (acumulado)</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orderData.processes.map(process => (
                        <ProcessProgressCard key={process.process_id} process={process} totalQuantity={orderData.total_quantity} />
                    ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {!loading && progressData.length === 0 && (
           <div className="text-center py-16 text-muted-foreground bg-secondary rounded-xl card-shadow">
             <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
             <h3 className="mt-2 text-lg font-medium text-text-primary">Todo en calma</h3>
             <p className="mt-1 text-sm">No hay órdenes de producción activas en este momento.</p>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductionProgressView;