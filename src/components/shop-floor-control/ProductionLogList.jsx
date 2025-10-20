import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

const ProductionLogList = ({ timerId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    if (!timerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('production_logs')
      .select('*')
      .eq('timer_id', timerId)
      .order('log_time', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los registros de avance.' });
    } else {
      setLogs(data);
    }
    setLoading(false);
  }, [timerId, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalProduced = logs.reduce((sum, log) => sum + log.produced_units, 0);

  return (
    <div className="space-y-4">
      <ScrollArea className="h-72 w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hora</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead className="text-right">Unidades</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="3" className="text-center">Cargando...</TableCell></TableRow>
            ) : logs.length > 0 ? (
              logs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.log_time).toLocaleTimeString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.notes}</TableCell>
                  <TableCell className="text-right font-medium">{log.produced_units}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="3" className="text-center">No hay avances registrados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="text-right font-bold text-lg pr-4">
        Total Acumulado: {totalProduced}
      </div>
    </div>
  );
};

export default ProductionLogList;