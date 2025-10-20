import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combine, PackagePlus, PackageMinus } from 'lucide-react';

const AssemblyView = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [productionOrder, setProductionOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [explosionItems, setExplosionItems] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');

  const fetchInitialData = useCallback(async () => {
    const { data: ordersData, error: ordersError } = await supabase
      .from('production_orders')
      .select('id, code, products(name)')
      .eq('status', 'Finalizada')
      .order('created_at', { ascending: false });

    if (ordersError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
    } else {
      setAvailableOrders(ordersData.map(order => ({
        value: order.id,
        label: `${order.code} - ${order.products?.name || 'N/A'}`
      })));
    }

    const { data: warehousesData, error: warehousesError } = await supabase.from('warehouses').select('id, name');
    if (warehousesError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las bodegas.' });
    } else {
      setWarehouses(warehousesData);
    }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const fetchLocations = async () => {
      if (!selectedWarehouseId) {
        setLocations([]);
        setSelectedLocationId('');
        return;
      }
      const { data } = await supabase.from('locations').select('*').eq('warehouse_id', selectedWarehouseId);
      setLocations(data || []);
    };
    fetchLocations();
  }, [selectedWarehouseId]);

  const handleOrderSelect = async (orderId) => {
    if (!orderId) {
      setProductionOrder(null);
      setExplosionItems([]);
      setSelectedOrderId('');
      return;
    }
    setSelectedOrderId(orderId);

    const { data: order, error: orderError } = await supabase
      .from('production_orders')
      .select('*, products(id, name, reference, last_cost)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      toast({ variant: 'destructive', title: 'Error', description: 'Orden de producción no encontrada.' });
      return;
    }
    setProductionOrder(order);

    const { data: explosion, error: expError } = await supabase
      .from('material_explosions')
      .select('id')
      .eq('production_order_id', order.id)
      .single();

    if (expError || !explosion) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se encontró explosión de materiales para esta OP.' });
      setExplosionItems([]);
      return;
    }

    const { data: items, error: itemsError } = await supabase
      .from('material_explosion_items')
      .select('*, inventory_items:material_id(name, reference, unit_of_measure, last_cost)')
      .eq('material_explosion_id', explosion.id);

    if (itemsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los materiales.' });
    } else {
      setExplosionItems(items);
    }
  };

  const handleSubmit = async () => {
    if (!productionOrder || explosionItems.length === 0 || !selectedLocationId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Completa todos los campos: OP, Bodega y Ubicación.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const movements = [];

      // 1. Create consumption movements for materials
      for (const item of explosionItems) {
        movements.push({
          item_id: item.material_id,
          movement_type: 'salida_consumo',
          quantity: item.required_quantity,
          cost_per_unit: item.inventory_items.last_cost || 0,
          warehouse_id: selectedWarehouseId,
          location_id: selectedLocationId,
          document_ref: `ENSAMBLE-${productionOrder.code}`,
          user_id: user.id,
        });
      }

      // 2. Create production entry movement for the finished product
      movements.push({
        item_id: productionOrder.products.id,
        movement_type: 'entrada_produccion',
        quantity: productionOrder.total_quantity,
        cost_per_unit: productionOrder.products.last_cost || 0,
        warehouse_id: selectedWarehouseId,
        location_id: selectedLocationId,
        document_ref: `ENSAMBLE-${productionOrder.code}`,
        user_id: user.id,
      });

      const { error } = await supabase.from('inventory_movements').insert(movements);
      if (error) throw error;

      toast({ title: 'Éxito', description: 'Ensamble procesado y movimientos de inventario generados.' });
      // Reset form
      setProductionOrder(null);
      setExplosionItems([]);
      setSelectedOrderId('');
      setSelectedWarehouseId('');
      setSelectedLocationId('');
      fetchInitialData(); // Refresh available orders
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al procesar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Hoja de Ensamble de Producción</h3>
      </div>

      <div className="p-4 rounded-lg border bg-background/50 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Orden de Producción (Finalizada)</Label>
            <Combobox
              items={availableOrders}
              value={selectedOrderId}
              onValueChange={handleOrderSelect}
              placeholder="Seleccionar OP..."
              searchPlaceholder="Buscar OP..."
              noResultsText="No se encontraron OPs."
            />
          </div>
          <div>
            <Label>Bodega de Movimientos</Label>
            <Select value={selectedWarehouseId} onValueChange={setSelectedWarehouseId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar bodega..." /></SelectTrigger>
              <SelectContent>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ubicación de Movimientos</Label>
            <Select value={selectedLocationId} onValueChange={setSelectedLocationId} disabled={!selectedWarehouseId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar ubicación..." /></SelectTrigger>
              <SelectContent>
                {locations.map(l => <SelectItem key={l.id} value={l.id}>{l.area} / {l.specific_location_code}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {productionOrder && (
        <div className="space-y-6">
          {/* Materials to be consumed */}
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2"><PackageMinus className="h-5 w-5 text-red-500" />Materiales a Consumir</h4>
            <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <Table>
                <TableHeader><TableRow><TableHead>Material</TableHead><TableHead>Referencia</TableHead><TableHead className="text-right">Cantidad Requerida</TableHead></TableRow></TableHeader>
                <TableBody>
                  {explosionItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{item.inventory_items.name}</TableCell>
                      <TableCell>{item.inventory_items.reference}</TableCell>
                      <TableCell className="text-right">{item.required_quantity} {item.inventory_items.unit_of_measure}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Finished product to be created */}
          <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2"><PackagePlus className="h-5 w-5 text-green-500" />Producto Terminado a Crear</h4>
            <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              <Table>
                <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>Referencia</TableHead><TableHead className="text-right">Cantidad a Producir</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{productionOrder.products.name}</TableCell>
                    <TableCell>{productionOrder.products.reference}</TableCell>
                    <TableCell className="text-right">{productionOrder.total_quantity} Unidades</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Combine className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Procesando...' : 'Procesar Ensamble'}
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AssemblyView;