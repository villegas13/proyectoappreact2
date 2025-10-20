import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';

export const MaterialsExplosionForm = ({ explosion, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [productionOrder, setProductionOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [explosionItems, setExplosionItems] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  const totalCost = useMemo(() => {
    return explosionItems.reduce((total, item) => total + (item.total_cost || 0), 0);
  }, [explosionItems]);

  const fetchAvailableOrders = useCallback(async () => {
    const { data: existingExplosionOrderIds, error: explosionError } = await supabase
      .from('material_explosions')
      .select('production_order_id');

    if (explosionError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron verificar las explosiones existentes.' });
      return;
    }
    
    const excludedOrderIds = existingExplosionOrderIds.map(e => e.production_order_id);

    let query = supabase
      .from('production_orders')
      .select('id, code, products(name)')
      .in('status', ['Planificada', 'En Proceso'])
      .order('created_at', { ascending: false });

    if (excludedOrderIds.length > 0 && !explosion) {
      query = query.not('id', 'in', `(${excludedOrderIds.join(',')})`);
    }

    const { data: ordersData, error: ordersError } = await query;
    
    if (ordersError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción disponibles.' });
    } else {
      setAvailableOrders(ordersData.map(order => ({
        value: order.id,
        label: `${order.code} - ${order.products?.name || 'Producto sin nombre'}`
      })));
    }
  }, [toast, explosion]);
  
  const fetchExplosionData = useCallback(async () => {
    if (explosion) {
      const { data: orderData, error: orderError } = await supabase
        .from('production_orders')
        .select('*, products(name, reference)')
        .eq('id', explosion.production_order_id)
        .single();

      if (orderError) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la orden de producción.' });
        return;
      }
      setProductionOrder(orderData);
      setSelectedOrderId(orderData.id);

      const { data: itemsData, error: itemsError } = await supabase
        .from('material_explosion_items')
        .select('*, inventory_items:material_id(name, unit_of_measure)')
        .eq('material_explosion_id', explosion.id);

      if (itemsError) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los materiales de la explosión.' });
      } else {
        setExplosionItems(itemsData);
      }
    }
  }, [explosion, toast]);

  useEffect(() => {
    fetchAvailableOrders();
    fetchExplosionData();
  }, [fetchAvailableOrders, fetchExplosionData]);


  const calculateExplosion = async (orderId) => {
    if (!orderId) {
        setProductionOrder(null);
        setExplosionItems([]);
        return;
    };

    const { data: order, error } = await supabase
      .from('production_orders')
      .select('*, products(id, name, reference)')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      toast({ variant: 'destructive', title: 'Error', description: 'Orden de producción no encontrada.' });
      setProductionOrder(null);
      setExplosionItems([]);
      return;
    } 
    
    setProductionOrder(order);
    toast({ title: 'Calculando...', description: 'Generando explosión de materiales.' });

    try {
      const { data: techSheet, error: techSheetError } = await supabase
        .from('tech_sheets')
        .select('id')
        .eq('product_id', order.products.id)
        .single();

      if (techSheetError || !techSheet) {
        throw new Error('No se encontró una ficha técnica para el producto de esta OP.');
      }

      const { data: techSheetMaterials, error: materialsError } = await supabase
        .from('tech_sheet_materials')
        .select('*, inventory_items(id, name, unit_of_measure, standard_cost)')
        .eq('tech_sheet_id', techSheet.id);
      
      if (materialsError) throw materialsError;

      const items = techSheetMaterials.map(mat => {
        const required_quantity = (mat.consumption_per_unit || 0) * (order.total_quantity || 0);
        const unit_cost = mat.cost || mat.inventory_items?.standard_cost || 0;
        const total_cost = required_quantity * unit_cost;

        return {
          material_id: mat.material_id,
          inventory_items: mat.inventory_items,
          required_quantity,
          unit_cost,
          total_cost,
        };
      });

      setExplosionItems(items);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error de cálculo', description: error.message });
      setExplosionItems([]);
    }
  };
  
  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId);
    calculateExplosion(orderId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productionOrder || explosionItems.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debe haber una OP y materiales calculados.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const explosionPayload = {
        production_order_id: productionOrder.id,
        code: explosion?.code || `EXP-${productionOrder.code}`,
        total_cost: totalCost,
      };

      const { data: savedExplosion, error } = await supabase
        .from('material_explosions')
        .upsert(explosion ? { ...explosionPayload, id: explosion.id } : explosionPayload)
        .select()
        .single();

      if (error) throw error;

      const explosionId = savedExplosion.id;

      if (explosion?.id) {
        await supabase.from('material_explosion_items').delete().eq('material_explosion_id', explosionId);
      }

      const itemsToSave = explosionItems.map(item => ({
        material_explosion_id: explosionId,
        material_id: item.material_id,
        required_quantity: item.required_quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
      }));

      const { error: itemsError } = await supabase.from('material_explosion_items').insert(itemsToSave);
      if (itemsError) throw itemsError;

      toast({ title: 'Éxito', description: 'Explosión de materiales guardada.' });
      onSuccess();
      closeModal();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 border-b space-y-4" style={{ borderColor: 'var(--border)' }}>
        <div className="space-y-2">
            <Label htmlFor="order-code">Orden de Producción</Label>
            <Combobox
                items={availableOrders}
                value={selectedOrderId}
                onValueChange={handleOrderSelect}
                placeholder="Seleccione una OP para calcular..."
                searchPlaceholder="Buscar por código o producto..."
                noResultsText="No se encontraron órdenes disponibles."
                disabled={!!explosion}
            />
        </div>
        {productionOrder && (
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <h4 className="font-semibold">OP: {productionOrder.code} - {productionOrder.products?.name}</h4>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Ref: {productionOrder.products?.reference} - Cantidad: {productionOrder.total_quantity} unidades
            </p>
          </div>
        )}
      </div>

      <div className="p-4">
        <h4 className="font-semibold text-lg mb-2">Materiales Requeridos</h4>
        <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>U. Medida</TableHead>
                <TableHead>Cant. Requerida</TableHead>
                <TableHead>Costo Unitario</TableHead>
                <TableHead>Costo Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {explosionItems.length > 0 ? (
                explosionItems.map((item, index) => (
                  <TableRow key={item.material_id || index}>
                    <TableCell>{item.inventory_items?.name || 'N/A'}</TableCell>
                    <TableCell>{item.inventory_items?.unit_of_measure || 'N/A'}</TableCell>
                    <TableCell>{item.required_quantity.toFixed(2)}</TableCell>
                    <TableCell>${(item.unit_cost || 0).toFixed(2)}</TableCell>
                    <TableCell>${(item.total_cost || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan="5" className="text-center h-24">
                    Selecciona una orden de producción para calcular los materiales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="text-right font-bold text-xl mt-4">Costo Total de Materiales: ${totalCost.toFixed(2)}</div>
      </div>

      <div className="flex justify-end gap-2 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || !productionOrder || explosionItems.length === 0}>
          {isSubmitting ? 'Guardando...' : 'Guardar Explosión'}
        </Button>
      </div>
    </form>
  );
};