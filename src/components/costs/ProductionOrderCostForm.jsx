import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const ProductionOrderCostForm = ({ productionOrder, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_order_costs')
      .select('*, cost_centers(name)')
      .eq('production_order_id', productionOrder.id)
      .order('cost_type');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los costos.' });
    } else {
      setCosts(data.map(c => ({ ...c, actual_cost: c.actual_cost ?? c.estimated_cost })));
    }
    setLoading(false);
  }, [productionOrder.id, toast]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  const handleCostChange = (id, value) => {
    setCosts(costs.map(c => c.id === id ? { ...c, actual_cost: parseFloat(value) || 0 } : c));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const updates = costs.map(({ id, actual_cost }) => ({
      id,
      actual_cost,
    }));

    try {
      const { error } = await supabase.from('production_order_costs').upsert(updates);
      if (error) throw error;
      toast({ title: 'Éxito', description: 'Costos reales actualizados.' });
      onSuccess();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const costsByCenter = costs.reduce((acc, cost) => {
    const centerName = cost.cost_centers.name;
    if (!acc[centerName]) {
      acc[centerName] = [];
    }
    acc[centerName].push(cost);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      {loading ? <p>Cargando detalles de costos...</p> : (
        <Accordion type="multiple" defaultValue={Object.keys(costsByCenter)} className="w-full">
          {Object.entries(costsByCenter).map(([centerName, centerCosts]) => (
            <AccordionItem value={centerName} key={centerName}>
              <AccordionTrigger>{centerName}</AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Costo</TableHead>
                      <TableHead>Costo Estimado</TableHead>
                      <TableHead>Costo Real</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centerCosts.map(cost => (
                      <TableRow key={cost.id}>
                        <TableCell>{cost.cost_type}</TableCell>
                        <TableCell>${cost.estimated_cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              step="0.01"
                              value={cost.actual_cost}
                              onChange={(e) => handleCostChange(cost.id, e.target.value)}
                              className="pl-6"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || loading}>
          {isSubmitting ? 'Guardando...' : 'Guardar Costos Reales'}
        </Button>
      </div>
    </form>
  );
};

export default ProductionOrderCostForm;