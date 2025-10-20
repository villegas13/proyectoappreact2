import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle } from 'lucide-react';

const StockAlertsReport = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('name, reference, current_stock, min_stock, max_stock')
      .or('current_stock.lt.min_stock,current_stock.gt.max_stock');

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las alertas de stock.' });
    } else {
      setAlerts(data.filter(item => item.min_stock > 0 || item.max_stock > 0));
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const getAlertType = (item) => {
    if (item.current_stock < item.min_stock) return { text: 'Bajo Stock', color: 'text-red-500' };
    if (item.current_stock > item.max_stock && item.max_stock > 0) return { text: 'Sobre Stock', color: 'text-yellow-500' };
    return { text: '', color: '' };
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h4 className="font-semibold">Reporte de Alertas de Stock</h4>
      <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ítem</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead className="text-center">Stock Mínimo</TableHead>
              <TableHead className="text-center">Stock Actual</TableHead>
              <TableHead className="text-center">Stock Máximo</TableHead>
              <TableHead>Alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
            ) : alerts.length > 0 ? (
              alerts.map((item) => {
                const alertType = getAlertType(item);
                return (
                  <TableRow key={item.reference}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.reference}</TableCell>
                    <TableCell className="text-center">{item.min_stock}</TableCell>
                    <TableCell className={`text-center font-bold ${alertType.color}`}>{item.current_stock}</TableCell>
                    <TableCell className="text-center">{item.max_stock}</TableCell>
                    <TableCell className={`font-semibold ${alertType.color}`}>
                      <div className="flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        {alertType.text}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow><TableCell colSpan="6" className="text-center">No hay alertas de stock activas.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default StockAlertsReport;