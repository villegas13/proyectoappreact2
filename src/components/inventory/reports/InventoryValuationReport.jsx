import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';

const InventoryValuationReport = () => {
  const [valuationData, setValuationData] = useState([]);
  const [totals, setTotals] = useState({ standard: 0, last_cost: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchValuationData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('name, reference, current_stock, standard_cost, last_cost')
      .gt('current_stock', 0);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la valorización del inventario.' });
    } else {
      const processedData = data.map(item => ({
        ...item,
        standard_valuation: (item.current_stock || 0) * (item.standard_cost || 0),
        last_cost_valuation: (item.current_stock || 0) * (item.last_cost || 0),
      }));
      setValuationData(processedData);

      const totalStandard = processedData.reduce((sum, item) => sum + item.standard_valuation, 0);
      const totalLastCost = processedData.reduce((sum, item) => sum + item.last_cost_valuation, 0);
      setTotals({ standard: totalStandard, last_cost: totalLastCost });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchValuationData();
  }, [fetchValuationData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 2 }).format(value);
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h4 className="font-semibold">Reporte de Valorización de Inventario</h4>
      <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ítem</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-right">Stock Actual</TableHead>
              <TableHead className="text-right">Valorización (Costo Estándar)</TableHead>
              <TableHead className="text-right">Valorización (Último Costo)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="5" className="text-center">Cargando...</TableCell></TableRow>
            ) : valuationData.length > 0 ? (
              valuationData.map((item) => (
                <TableRow key={item.reference}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.reference}</TableCell>
                  <TableCell className="text-right">{item.current_stock}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.standard_valuation)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.last_cost_valuation)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="5" className="text-center">No hay inventario para valorizar.</TableCell></TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan="3" className="font-bold text-right">TOTALES</TableCell>
              <TableCell className="text-right font-extrabold">{formatCurrency(totals.standard)}</TableCell>
              <TableCell className="text-right font-extrabold">{formatCurrency(totals.last_cost)}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
};

export default InventoryValuationReport;