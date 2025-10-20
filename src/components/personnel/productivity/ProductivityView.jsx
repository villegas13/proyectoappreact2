import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ProductivityForm from '@/components/personnel/productivity/ProductivityForm';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';

const ProductivityView = () => {
  const [productionRecords, setProductionRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const { toast } = useToast();
  const { profile } = useAuth();

  const canManage = profile?.role === 'SuperAdministrador' || profile?.role === 'Administrador' || profile?.role === 'Supervisor';

  const fetchProduction = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employee_production')
      .select(`
        *,
        employees (full_name),
        production_orders (code),
        operations (name)
      `)
      .eq('production_date', dateFilter)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los registros de producción.' });
    } else {
      setProductionRecords(data);
      setFilteredRecords(data);
    }
    setLoading(false);
  }, [toast, dateFilter]);

  useEffect(() => {
    fetchProduction();
  }, [fetchProduction]);

  useEffect(() => {
    const results = productionRecords.filter(record =>
      record.employees.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecords(results);
  }, [searchTerm, productionRecords]);

  const handleAddNew = () => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para registrar producción.' });
      return;
    }
    setEditingRecord(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (record) => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para editar registros.' });
      return;
    }
    setEditingRecord(record);
    setIsDialogOpen(true);
  };

  const handleDelete = async (recordId) => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para eliminar registros.' });
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      const { error } = await supabase.from('employee_production').delete().eq('id', recordId);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Éxito', description: 'Registro eliminado correctamente.' });
        fetchProduction();
      }
    }
  };

  const getEfficiencyBadge = (efficiency) => {
    const eff = parseFloat(efficiency);
    if (eff >= 90) return 'bg-green-500';
    if (eff >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre de empleado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto"
          />
        </div>
        {canManage && (
          <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Registrar Producción
          </Button>
        )}
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>OP</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Unidades Producidas</TableHead>
              <TableHead>Eficiencia</TableHead>
              {canManage && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={canManage ? 6 : 5} className="text-center">Cargando registros...</TableCell></TableRow>
            ) : filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{rec.employees?.full_name}</TableCell>
                  <TableCell>{rec.production_orders?.code}</TableCell>
                  <TableCell>{rec.operations?.name}</TableCell>
                  <TableCell>{rec.produced_units}</TableCell>
                  <TableCell>
                    <Badge className={getEfficiencyBadge(rec.efficiency)}>
                      {rec.efficiency ? `${parseFloat(rec.efficiency).toFixed(2)}%` : 'N/A'}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rec.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={canManage ? 6 : 5} className="text-center">No se encontraron registros para esta fecha.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar' : 'Registrar'} Producción</DialogTitle>
            <DialogDescription>
              {editingRecord ? 'Actualiza los detalles del registro de producción.' : 'Completa el formulario para registrar la producción de un empleado.'}
            </DialogDescription>
          </DialogHeader>
          <ProductivityForm 
            record={editingRecord} 
            onSuccess={() => {
              fetchProduction();
              setIsDialogOpen(false);
            }} 
            closeModal={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ProductivityView;