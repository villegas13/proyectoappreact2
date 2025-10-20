import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Eye, Trash2, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';

const EfficiencyCell = ({ efficiency }) => {
  if (efficiency === null || isNaN(efficiency)) {
    return <TableCell className="text-center">-</TableCell>;
  }

  const value = Math.round(efficiency * 100);
  const colorClass =
    value >= 95
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      : value >= 80
      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';

  return (
    <TableCell className={cn('text-center font-semibold', colorClass)}>
      {value}%
    </TableCell>
  );
};

const StatusBadge = ({ status }) => {
  const variant = status === 'Finalizada' ? 'success' : 'default';
  return <Badge variant={variant}>{status}</Badge>;
};

const ShopFloorTableView = () => {
  const [productionData, setProductionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ orderCode: '', productName: '', processName: '', opStatus: '' });
  const [filterOptions, setFilterOptions] = useState({ orders: [], products: [], processes: [] });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const { toast } = useToast();

  const fetchFilterOptions = useCallback(async () => {
    const { data: orders, error: ordersError } = await supabase.from('production_orders').select('code');
    const { data: products, error: productsError } = await supabase.from('products').select('name');
    const { data: processes, error: processesError } = await supabase.from('processes').select('name');

    if (ordersError || productsError || processesError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las opciones de filtro.' });
    } else {
      setFilterOptions({
        orders: orders.map(o => ({ value: o.code, label: o.code })),
        products: products.map(p => ({ value: p.name, label: p.name })),
        processes: processes.map(p => ({ value: p.name, label: p.name })),
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  const fetchProductionData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_shop_floor_production_data', {
      p_order_code: filters.orderCode || null,
      p_product_name: filters.productName || null,
      p_process_name: filters.processName || null,
      p_op_status: filters.opStatus || null,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar datos',
        description: 'No se pudo obtener la información de producción.',
      });
      console.error('Error fetching production data:', error);
    } else {
      setProductionData(data);
    }
    setLoading(false);
  }, [toast, filters]);

  useEffect(() => {
    fetchProductionData();

    const channel = supabase
      .channel('shop-floor-table-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_timers' }, fetchProductionData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, fetchProductionData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_orders' }, fetchProductionData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProductionData]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value === 'ALL_STATUS' ? '' : value }));
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    
    const { error } = await supabase.from('production_timers').delete().eq('id', recordToDelete.timer_id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el registro.' });
    } else {
      toast({ title: 'Éxito', description: 'Registro de producción eliminado.' });
      fetchProductionData();
    }
    setIsDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  const openDeleteDialog = (record) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '-', time: '-' };
    const dt = new Date(dateTimeStr);
    return {
      date: dt.toLocaleDateString(),
      time: dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg border bg-background/50 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros Avanzados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Combobox
            items={filterOptions.orders}
            value={filters.orderCode}
            onValueChange={(value) => handleFilterChange('orderCode', value)}
            placeholder="Filtrar por OP..."
            searchPlaceholder="Buscar OP..."
            noResultsText="No se encontró la OP."
          />
          <Combobox
            items={filterOptions.products}
            value={filters.productName}
            onValueChange={(value) => handleFilterChange('productName', value)}
            placeholder="Filtrar por Producto..."
            searchPlaceholder="Buscar producto..."
            noResultsText="No se encontró el producto."
          />
          <Combobox
            items={filterOptions.processes}
            value={filters.processName}
            onValueChange={(value) => handleFilterChange('processName', value)}
            placeholder="Filtrar por Proceso..."
            searchPlaceholder="Buscar proceso..."
            noResultsText="No se encontró el proceso."
          />
          <Select value={filters.opStatus || 'ALL_STATUS'} onValueChange={(value) => handleFilterChange('opStatus', value)}>
            <SelectTrigger><SelectValue placeholder="Filtrar por Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_STATUS">Todos los estados</SelectItem>
              <SelectItem value="En Proceso">En Proceso</SelectItem>
              <SelectItem value="Finalizada">Finalizada</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchProductionData} className="w-full"><Search className="mr-2 h-4 w-4" /> Buscar</Button>
        </div>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estación</TableHead>
              <TableHead>Operario</TableHead>
              <TableHead>OP</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Proceso</TableHead>
              <TableHead>F. Inicio</TableHead>
              <TableHead>H. Inicio</TableHead>
              <TableHead>F. Fin</TableHead>
              <TableHead>H. Fin</TableHead>
              <TableHead className="text-center">Uds. Acum.</TableHead>
              <TableHead className="text-center">Meta/Hora</TableHead>
              <TableHead className="text-center">Eficiencia</TableHead>
              <TableHead>Avance OP</TableHead>
              <TableHead className="text-right">Saldo OP</TableHead>
              <TableHead className="text-center">Estado OP</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={16} className="text-center h-24">Cargando datos de producción...</TableCell></TableRow>
            ) : productionData.length === 0 ? (
              <TableRow><TableCell colSpan={16} className="text-center h-24">No se encontraron registros con los filtros aplicados.</TableCell></TableRow>
            ) : (
              productionData.map((row) => {
                const progress = row.op_total_quantity > 0 ? (row.accumulated_units / row.op_total_quantity) * 100 : 0;
                const balance = row.op_total_quantity - row.accumulated_units;
                const { date: startDate, time: startTime } = formatDateTime(row.start_time);
                const { date: endDate, time: endTime } = formatDateTime(row.end_time);

                return (
                  <TableRow key={row.timer_id}>
                    <TableCell className="font-medium">{row.workstation_name}</TableCell>
                    <TableCell>{row.employee_name}</TableCell>
                    <TableCell>{row.production_order_code}</TableCell>
                    <TableCell>{row.product_name}</TableCell>
                    <TableCell>{row.process_name}</TableCell>
                    <TableCell>{startDate}</TableCell>
                    <TableCell>{startTime}</TableCell>
                    <TableCell>{endDate}</TableCell>
                    <TableCell>{endTime}</TableCell>
                    <TableCell className="text-center font-bold">{row.accumulated_units}</TableCell>
                    <TableCell className="text-center">{row.hourly_goal || '-'}</TableCell>
                    <EfficiencyCell efficiency={row.accumulated_efficiency} />
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={progress} className="w-24" />
                        <span className="text-xs font-mono">{Math.round(progress)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{balance}</TableCell>
                    <TableCell className="text-center"><StatusBadge status={row.op_status} /></TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toast({ title: 'Próximamente', description: 'La vista de detalles estará disponible pronto.' })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => openDeleteDialog(row)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar este registro de producción? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShopFloorTableView;