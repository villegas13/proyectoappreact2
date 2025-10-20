import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import CostCenterForm from '@/components/costs/CostCenterForm';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const statusColors = {
  'Activo': 'bg-green-500',
  'Inactivo': 'bg-red-500',
};

const CostCentersView = () => {
  const [costCenters, setCostCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const { toast } = useToast();
  const { profile } = useAuth();

  const canManage = profile?.role === 'SuperAdministrador' || profile?.role === 'Administrador';

  const fetchCostCenters = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los centros de costo.' });
    } else {
      setCostCenters(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const handleAddNew = () => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para añadir centros de costo.' });
      return;
    }
    setEditingCenter(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (center) => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para editar.' });
      return;
    }
    setEditingCenter(center);
    setIsDialogOpen(true);
  };

  const handleDelete = async (centerId) => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para eliminar.' });
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este centro de costo?')) {
      const { error } = await supabase.from('cost_centers').delete().eq('id', centerId);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar: ${error.message}` });
      } else {
        toast({ title: 'Éxito', description: 'Centro de costo eliminado.' });
        fetchCostCenters();
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Maestro de Centros de Costo</h3>
        {canManage && (
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" /> + Nuevo Centro de Costo
          </Button>
        )}
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Estado</TableHead>
              {canManage && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={canManage ? 5 : 4} className="text-center">Cargando...</TableCell></TableRow>
            ) : costCenters.length > 0 ? (
              costCenters.map((center) => (
                <TableRow key={center.id}>
                  <TableCell className="font-medium">{center.name}</TableCell>
                  <TableCell>{center.type}</TableCell>
                  <TableCell>{center.manager || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[center.status] || 'bg-gray-500'} text-white`}>{center.status}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(center)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(center.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={canManage ? 5 : 4} className="text-center">No hay centros de costo creados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCenter ? 'Editar Centro de Costo' : 'Crear Centro de Costo'}</DialogTitle>
            <DialogDescription>
              {editingCenter ? 'Actualiza los detalles del centro de costo.' : 'Completa el formulario para crear un nuevo centro de costo.'}
            </DialogDescription>
          </DialogHeader>
          <CostCenterForm 
            center={editingCenter} 
            onSuccess={() => {
              fetchCostCenters();
              setIsDialogOpen(false);
            }} 
            closeModal={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CostCentersView;