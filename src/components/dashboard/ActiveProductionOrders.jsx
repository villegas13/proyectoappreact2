import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Progress } from '@/components/ui/progress';
import { Zap, Target, CheckCircle, Loader2 } from 'lucide-react';

const ActiveProductionOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchActiveOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_active_production_orders_summary');
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar las órdenes activas.',
        });
        console.error(error);
      } else {
        setOrders(data);
      }
      setLoading(false);
    };

    fetchActiveOrders();

    const channel = supabase
      .channel('active-orders-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, fetchActiveOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_timers', filter: 'status=eq.En Progreso' }, fetchActiveOrders)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-6 rounded-xl card-shadow"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Órdenes de Producción Activas
      </h2>
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="mx-auto h-10 w-10 mb-2" />
            <p>No hay órdenes de producción activas.</p>
          </div>
        ) : (
          orders.map((order, index) => {
            const progress = order.total_quantity > 0 ? (order.total_produced / order.total_quantity) * 100 : 0;
            const efficiency = order.avg_efficiency ? Math.round(order.avg_efficiency * 100) : 0;
            
            return (
              <motion.div
                key={order.order_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 rounded-lg border"
                style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">{order.order_code} - {order.product_name}</span>
                  <div className="flex items-center gap-1 text-sm font-semibold text-yellow-500">
                    <Zap className="w-4 h-4" />
                    <span>{efficiency}%</span>
                  </div>
                </div>
                <Progress value={progress} className="w-full" />
                <div className="flex justify-between items-center text-xs mt-1 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    <span>{order.total_produced} / {order.total_quantity}</span>
                  </div>
                  <span>Saldo: {order.total_quantity - order.total_produced}</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};

export default ActiveProductionOrders;