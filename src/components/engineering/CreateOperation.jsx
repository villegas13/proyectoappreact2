import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { OperationForm } from '@/components/engineering/OperationForm';

const CreateOperation = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchOperations = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('operations')
      .select('*, processes(name), operation_standards(*), time_measurements(*)');

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
    }
    
    query = query.order('code', { ascending: true });

    const { data, error } = await query;

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las operaciones.' });
    } else {
      setOperations(data);
    }
    setLoading(false);
  }, [toast, searchTerm]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOperations();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchOperations, searchTerm]);

  const handleAddNew = () => {
    setEditingOperation(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (operation) => {
    setEditingOperation(operation);
    setIsDialogOpen(true);
  };

  const handleDelete = async (operationId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta operación?')) {
      const { error } = await supabase.from('operations').delete().eq('id', operationId);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar: ${error.message}` });
      } else {
        toast({ title: 'Éxito', description: 'Operación eliminada.' });
        fetchOperations();
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Maestro de Operaciones</h3>
          <p className="text-sm text-muted-foreground">Crea, edita y gestiona las operaciones de producción.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Operación
        </Button>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Buscar por código o nombre..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Proceso</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead>Tiempo Estándar (min)</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
            ) : operations.length > 0 ? (
              operations.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">{op.code}</TableCell>
                  <TableCell>{op.name}</TableCell>
                  <TableCell>{op.processes?.name || 'N/A'}</TableCell>
                  <TableCell>{op.machine || 'N/A'}</TableCell>
                  <TableCell>{op.operation_standards[0]?.standard_time?.toFixed(4) || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(op)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(op.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="6" className="text-center">No se encontraron operaciones.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingOperation ? 'Editar Operación' : 'Crear Nueva Operación'}</DialogTitle>
            <DialogDescription>
              {editingOperation ? 'Actualiza los detalles de la operación.' : 'Completa el formulario para crear una nueva operación.'}
            </DialogDescription>
          </DialogHeader>
          <OperationForm 
            operationData={editingOperation} 
            onSuccess={() => {
              fetchOperations();
              setIsDialogOpen(false);
            }} 
            closeModal={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CreateOperation;