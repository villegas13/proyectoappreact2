import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calculator, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import ProductionOrderCostForm from '@/components/costs/ProductionOrderCostForm';

const ProductionOrderCostsView = () => {
  const [productionOrders, setProductionOrders] = useState([]);
  const [costs, setCosts] = useState({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { toast } = useToast();

  const fetchOrdersAndCosts = useCallback(async () => {
    setLoading(true);
    const { data: ordersData, error: ordersError } = await supabase
      .from('production_orders')
      .select('*, products(name)')
      .order('created_at', { ascending: false });

    if (ordersError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
      setLoading(false);
      return;
    }
    setProductionOrders(ordersData);

    const { data: costsData, error: costsError } = await supabase
      .from('production_order_costs')
      .select('production_order_id, estimated_cost, actual_cost');

    if (costsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los costos.' });
    } else {
      const costsByOrder = costsData.reduce((acc, cost) => {
        if (!acc[cost.production_order_id]) {
          acc[cost.production_order_id] = { estimated: 0, actual: 0 };
        }
        acc[cost.production_order_id].estimated += cost.estimated_cost || 0;
        acc[cost.production_order_id].actual += cost.actual_cost || 0;
        return acc;
      }, {});
      setCosts(costsByOrder);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchOrdersAndCosts();
  }, [fetchOrdersAndCosts]);

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const handleCalculateCosts = async (order) => {
    toast({ title: 'Calculando costos estimados...', description: 'Esto puede tardar un momento.' });
    
    try {
      // 0. Fetch Cost Center Rates
      const { data: costCenters, error: ccError } = await supabase.from('cost_centers').select('id, labor_cost_per_minute, indirect_cost_percentage');
      if (ccError) throw new Error('No se pudieron cargar las tarifas de los centros de costo.');
      const laborRates = Object.fromEntries(costCenters.map(c => [c.id, c.labor_cost_per_minute || 0]));
      const indirectRates = Object.fromEntries(costCenters.map(c => [c.id, c.indirect_cost_percentage || 0]));

      // 1. Fetch Material Explosion
      const { data: explosion, error: expError } = await supabase
        .from('material_explosions')
        .select('id')
        .eq('production_order_id', order.id)
        .single();
      if (expError || !explosion) throw new Error('No se encontró explosión de materiales para esta OP.');

      const { data: explosionItems, error: expItemsError } = await supabase
        .from('material_explosion_items')
        .select('*, inventory_items(cost_center_id, name)')
        .eq('material_explosion_id', explosion.id);
      if (expItemsError) throw expItemsError;

      // 2. Fetch Operation Sheet
      const { data: opSheet, error: sheetError } = await supabase
        .from('operation_sheets')
        .select('id, total_sam')
        .eq('product_id', order.product_id)
        .single();
      if (sheetError || !opSheet) throw new Error('No se encontró hoja de operaciones para este producto.');

      const { data: opSheetItems, error: opItemsError } = await supabase
        .from('operation_sheet_items')
        .select('*, operations(name, cost_center_id, operation_standards(standard_time))')
        .eq('operation_sheet_id', opSheet.id);
      if (opItemsError) throw opItemsError;

      // 3. Group costs by cost center
      const costByCenter = {};

      // Material Costs
      for (const item of explosionItems) {
        const ccId = item.inventory_items?.cost_center_id;
        if (!ccId) {
          toast({ variant: 'destructive', title: 'Advertencia', description: `Material ${item.inventory_items?.name} sin centro de costo. No se puede calcular.` });
          continue;
        }
        if (!costByCenter[ccId]) costByCenter[ccId] = { material: 0, labor: 0, indirect: 0 };
        costByCenter[ccId].material += item.total_cost;
      }

      // Labor Costs
      for (const item of opSheetItems) {
        const ccId = item.operations?.cost_center_id;
        const standardTime = item.operations?.operation_standards[0]?.standard_time || 0;
        if (!ccId) {
          toast({ variant: 'destructive', title: 'Advertencia', description: `Operación ${item.operations?.name} sin centro de costo. No se puede calcular.` });
          continue;
        }
        if (!costByCenter[ccId]) costByCenter[ccId] = { material: 0, labor: 0, indirect: 0 };
        const laborRate = laborRates[ccId] || 0;
        if (laborRate === 0) {
            toast({ variant: 'destructive', title: 'Advertencia', description: `Centro de costo para la operación ${item.operations?.name} no tiene tarifa de mano de obra.` });
        }
        const laborCost = standardTime * order.total_quantity * laborRate;
        costByCenter[ccId].labor += laborCost;
        
        // Indirect Costs
        const indirectRate = indirectRates[ccId] || 0;
        costByCenter[ccId].indirect += laborCost * (indirectRate / 100);
      }

      // 4. Prepare for insertion
      const costsToInsert = [];
      for (const [ccId, costs] of Object.entries(costByCenter)) {
        if (costs.material > 0) {
          costsToInsert.push({ production_order_id: order.id, cost_center_id: ccId, cost_type: 'Materiales', estimated_cost: costs.material });
        }
        if (costs.labor > 0) {
          costsToInsert.push({ production_order_id: order.id, cost_center_id: ccId, cost_type: 'Mano de Obra', estimated_cost: costs.labor });
        }
        if (costs.indirect > 0) {
          costsToInsert.push({ production_order_id: order.id, cost_center_id: ccId, cost_type: 'Indirectos', estimated_cost: costs.indirect });
        }
      }

      // 5. Delete old costs and insert new ones
      await supabase.from('production_order_costs').delete().eq('production_order_id', order.id);
      const { error: insertError } = await supabase.from('production_order_costs').insert(costsToInsert);
      if (insertError) throw insertError;

      toast({ title: 'Éxito', description: 'Costos estimados calculados y guardados.' });
      fetchOrdersAndCosts();

    } catch (error) {
      toast({ variant: 'destructive', title: 'Error en el cálculo', description: error.message });
      console.error(error);
    }
  };

  const renderVariation = (estimated, actual) => {
    if (estimated === 0) return <span className="text-gray-500">-</span>;
    const variation = ((actual - estimated) / estimated) * 100;
    const color = variation > 0 ? 'text-red-500' : 'text-green-500';
    const Icon = variation > 0 ? TrendingUp : TrendingDown;
    return (
      <span className={`flex items-center font-semibold ${color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {variation.toFixed(2)}%
      </span>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Costos por Orden de Producción</h3>
      
      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código OP</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Costo Estimado</TableHead>
              <TableHead>Costo Real</TableHead>
              <TableHead>Variación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
            ) : productionOrders.map((order) => {
              const orderCosts = costs[order.id] || { estimated: 0, actual: 0 };
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.code}</TableCell>
                  <TableCell>{order.products.name}</TableCell>
                  <TableCell>${orderCosts.estimated.toFixed(2)}</TableCell>
                  <TableCell>${orderCosts.actual.toFixed(2)}</TableCell>
                  <TableCell>{renderVariation(orderCosts.estimated, orderCosts.actual)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handleCalculateCosts(order)}><Calculator className="h-4 w-4 mr-2" />Calcular</Button>
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(order)}><Eye className="h-4 w-4 mr-2" />Detalles</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de Costos - {selectedOrder?.code}</DialogTitle>
            <DialogDescription>
              Visualiza y edita los costos reales de la orden de producción.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <ProductionOrderCostForm
              productionOrder={selectedOrder}
              onSuccess={() => {
                fetchOrdersAndCosts();
                setIsDialogOpen(false);
              }}
              closeModal={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ProductionOrderCostsView;