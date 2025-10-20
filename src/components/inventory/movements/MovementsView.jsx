import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Search, ArrowUpDown, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import MovementForm from './MovementForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MovementsView = () => {
  const { toast } = useToast();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'descending' });
  const [filters, setFilters] = useState({ type: 'all', warehouse: 'all' });
  const [warehouses, setWarehouses] = useState([]);

  const movementTypeMapping = {
    'entrada_compra': 'Entrada por Compra',
    'entrada_produccion': 'Entrada por Producción',
    'salida_consumo': 'Salida por Consumo',
    'salida_venta': 'Salida por Venta',
    'ajuste_entrada': 'Ajuste de Entrada',
    'ajuste_salida': 'Ajuste de Salida',
    'transferencia_entrada': 'Transferencia (Entrada)',
    'transferencia_salida': 'Transferencia (Salida)',
    'devolucion_cliente': 'Devolución de Cliente',
    'devolucion_proveedor': 'Devolución a Proveedor',
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          item:inventory_items(name, reference),
          warehouse:warehouses(name),
          location:locations(specific_location_code, area),
          user:users(raw_user_meta_data)
        `)
        .order('created_at', { ascending: sortConfig.direction === 'ascending' });

      if (error) {
        console.error("Error fetching movements:", error);
        throw new Error(`Error fetching movements: ${error.message}`);
      }
      
      setMovements(data || []);

      const { data: whData, error: whError } = await supabase.from('warehouses').select('id, name');
      if (whError) throw whError;
      setWarehouses(whData || []);

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al cargar datos',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [toast, sortConfig]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddMovement = () => {
    setEditingMovement(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchData();
  };

  const filteredMovements = useMemo(() => {
    return movements
      .filter(movement => {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          (movement.item?.name?.toLowerCase().includes(searchTermLower) ||
           movement.item?.reference?.toLowerCase().includes(searchTermLower) ||
           movement.document_ref?.toLowerCase().includes(searchTermLower)) &&
          (filters.type === 'all' || movement.movement_type === filters.type) &&
          (filters.warehouse === 'all' || movement.warehouse_id === filters.warehouse)
        );
      })
      .sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
  }, [movements, searchTerm, sortConfig, filters]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="w-4 h-4 ml-2 opacity-30" />;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Movimientos de Inventario</h2>
          <p className="text-muted-foreground">Historial de todas las transacciones de inventario.</p>
        </div>
        <Button onClick={handleAddMovement}>
          <PlusCircle className="mr-2 h-4 w-4" /> Registrar Movimiento
        </Button>
      </div>

      <div className="flex items-center space-x-4 bg-card p-4 rounded-lg shadow-sm">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar por ítem, referencia o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select value={filters.type} onValueChange={(value) => setFilters(f => ({ ...f, type: value }))}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo de movimiento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Tipos</SelectItem>
              {Object.entries(movementTypeMapping).map(([key, value]) => (
                <SelectItem key={key} value={key}>{value}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.warehouse} onValueChange={(value) => setFilters(f => ({ ...f, warehouse: value }))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Almacén" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Almacenes</SelectItem>
              {warehouses.map(wh => (
                <SelectItem key={wh.id} value={wh.id}>{wh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('created_at')} className="cursor-pointer">Fecha {getSortIndicator('created_at')}</TableHead>
              <TableHead>Ítem</TableHead>
              <TableHead onClick={() => requestSort('movement_type')} className="cursor-pointer">Tipo {getSortIndicator('movement_type')}</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Costo Unit.</TableHead>
              <TableHead className="text-right">Costo Total</TableHead>
              <TableHead>Almacén/Ubicación</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Documento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center">Cargando movimientos...</TableCell></TableRow>
            ) : filteredMovements.length > 0 ? (
              filteredMovements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{format(new Date(m.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                  <TableCell>
                    <div className="font-medium">{m.item?.name}</div>
                    <div className="text-sm text-muted-foreground">{m.item?.reference}</div>
                  </TableCell>
                  <TableCell>{movementTypeMapping[m.movement_type] || m.movement_type}</TableCell>
                  <TableCell className={`text-right font-bold ${m.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {m.quantity.toLocaleString('es-CO')}
                  </TableCell>
                  <TableCell className="text-right">${(m.cost_per_unit || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-semibold">${(m.total_cost || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <div>{m.warehouse?.name}</div>
                    <div className="text-sm text-muted-foreground">{m.location?.area} - {m.location?.specific_location_code}</div>
                  </TableCell>
                  <TableCell>{m.user?.raw_user_meta_data?.first_name || 'Sistema'}</TableCell>
                  <TableCell>{m.document_ref}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={9} className="text-center">No se encontraron movimientos.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingMovement ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento'}</DialogTitle>
            <DialogDescription>
              Completa los detalles para registrar una nueva transacción de inventario.
            </DialogDescription>
          </DialogHeader>
          <MovementForm movement={editingMovement} onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MovementsView;