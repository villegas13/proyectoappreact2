import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const StockByLocationReport = () => {
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStockData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_stock')
      .select(`
        quantity,
        item:inventory_items(name, reference),
        location:locations(specific_location_code, area, warehouse:warehouses(name))
      `)
      .gt('quantity', 0)
      .order('name', { foreignTable: 'item', ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el stock por ubicación.' });
    } else {
      setStockData(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  return (
    <div className="space-y-4 p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h4 className="font-semibold">Reporte de Stock por Bodega y Ubicación</h4>
      <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ítem</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Bodega</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
            ) : stockData.length > 0 ? (
              stockData.map((stock, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{stock.item.name}</TableCell>
                  <TableCell>{stock.item.reference}</TableCell>
                  <TableCell>{stock.location.warehouse.name}</TableCell>
                  <TableCell>{stock.location.area}</TableCell>
                  <TableCell>{stock.location.specific_location_code}</TableCell>
                  <TableCell className="text-right font-bold">{stock.quantity}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="6" className="text-center">No hay stock registrado en ninguna ubicación.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StockByLocationReport;