import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, FileText } from 'lucide-react';
import { cn } from "@/lib/utils";

const PurchaseRequisitionForm = ({ requisition, onSuccess, closeModal }) => {
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedProductionOrder, setSelectedProductionOrder] = useState(null);
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  const fetchAvailableOrders = useCallback(async () => {
    const { data: existingRequisitionOrderIds, error: requisitionError } = await supabase
        .from('purchase_requisitions')
        .select('production_order_id');

    if (requisitionError) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron verificar los requerimientos existentes.' });
        return;
    }

    const excludedOrderIds = existingRequisitionOrderIds.map(e => e.production_order_id).filter(Boolean);

    let query = supabase
        .from('production_orders')
        .select('id, code, status, products(name, reference)')
        .in('status', ['En Proceso', 'Planificada']);
    
    if (excludedOrderIds.length > 0 && !requisition) {
        query = query.not('id', 'in', `(${excludedOrderIds.join(',')})`);
    }
        
    const { data, error } = await query;
    
    if (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
    } else {
        setAvailableOrders(data);
    }
  }, [toast, requisition]);

  useEffect(() => {
    fetchAvailableOrders();
  }, [fetchAvailableOrders]);

  useEffect(() => {
    if (requisition) {
      setSelectedProductionOrder(requisition.production_order_id);
      setGeneralNotes(requisition.general_notes || '');
    }
  }, [requisition]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedProductionOrder) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar una orden de producción.' });
      setLoading(false);
      return;
    }

    const { data: explosionData, error: explosionError } = await supabase
      .from('material_explosions')
      .select('id')
      .eq('production_order_id', selectedProductionOrder)
      .maybeSingle();

    if (explosionError) {
      toast({ variant: 'destructive', title: 'Error de base de datos', description: 'No se pudo verificar la explosión de materiales.' });
      console.error(explosionError);
      setLoading(false);
      return;
    }

    if (!explosionData) {
      toast({
        variant: 'destructive',
        title: 'Acción Requerida',
        description: 'No existe una explosión de materiales para esta OP. Por favor, calcúlala primero en el módulo de "Explosión Mat.".'
      });
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const requesterName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : user?.email;

    const requisitionData = {
      production_order_id: selectedProductionOrder,
      material_explosion_id: explosionData.id,
      status: requisition?.status || 'Pendiente',
      general_notes: generalNotes,
      requester_id: user.id,
      requester_name: requesterName,
    };

    let result;
    if (requisition) {
      result = await supabase.from('purchase_requisitions').update(requisitionData).eq('id', requisition.id);
    } else {
      result = await supabase.from('purchase_requisitions').insert([requisitionData]);
    }

    const { error } = result;

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Éxito', description: `Requerimiento ${requisition ? 'actualizado' : 'creado'} correctamente.` });
      onSuccess();
      closeModal();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
      <div className="space-y-2">
        <Label>Selecciona una Orden de Producción</Label>
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-64 overflow-y-auto p-2 rounded-lg" style={{backgroundColor: 'var(--bg-primary)'}}>
            {availableOrders.length > 0 ? availableOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                onClick={() => !requisition && setSelectedProductionOrder(order.id)}
                className={cn(
                  "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 relative",
                  selectedProductionOrder === order.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border hover:border-blue-400',
                  requisition ? 'cursor-not-allowed opacity-60' : ''
                )}
              >
                {selectedProductionOrder === order.id && (
                  <motion.div initial={{scale: 0}} animate={{scale: 1}} className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                    <CheckCircle className="h-4 w-4" />
                  </motion.div>
                )}
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-bold text-lg">{order.code}</p>
                    <p className="text-sm text-text-secondary">{order.products?.name || 'Producto no especificado'}</p>
                    <p className="text-xs text-text-secondary">Ref: {order.products?.reference || 'N/A'}</p>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="col-span-full text-center p-8 text-text-secondary">
                <p>No hay órdenes de producción disponibles para crear un requerimiento.</p>
              </div>
            )}
          </div>
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <Label htmlFor="general-notes">Notas Generales</Label>
        <Textarea
          id="general-notes"
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          placeholder="Añade cualquier nota o instrucción general para este requerimiento."
        />
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={closeModal} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !selectedProductionOrder} className="bg-blue-500 hover:bg-blue-600 text-white">
          {loading ? 'Guardando...' : (requisition ? 'Actualizar Requerimiento' : 'Crear Requerimiento')}
        </Button>
      </div>
    </form>
  );
};

export default PurchaseRequisitionForm;