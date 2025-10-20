import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Eye, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MaterialsExplosionForm } from '@/components/planning/materials-explosion/MaterialsExplosionForm';

const MaterialsExplosionView = () => {
  const [explosions, setExplosions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExplosion, setEditingExplosion] = useState(null);
  const { toast } = useToast();

  const fetchExplosions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('material_explosions')
      .select('*, production_orders(code, products(name))')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las explosiones de materiales.' });
      console.error(error);
    } else {
      setExplosions(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchExplosions();
  }, [fetchExplosions]);

  const handleAddNew = () => {
    setEditingExplosion(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (explosion) => {
    setEditingExplosion(explosion);
    setIsDialogOpen(true);
  };
  
  const handleView = (explosion) => {
     toast({ title: "🚧 No implementado", description: "La visualización no está implementada aún. ¡Solicítala!" });
  };

  const handleDelete = async (explosionId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta explosión de materiales?')) {
      await supabase.from('material_explosion_items').delete().eq('material_explosion_id', explosionId);
      const { error } = await supabase.from('material_explosions').delete().eq('id', explosionId);

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Éxito', description: 'Explosión de materiales eliminada.' });
        fetchExplosions();
      }
    }
  };
  
  const handleExportPDF = (explosion) => {
    toast({ title: "🚧 No implementado", description: "La exportación a PDF no está implementada aún. ¡Solicítala!" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Listado de Explosión de Materiales</h3>
        <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Calcular Nueva Explosión
        </Button>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código Explosión</TableHead>
              <TableHead>Orden de Producción</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Costo Total</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
            ) : explosions.length > 0 ? (
              explosions.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-medium">{exp.code}</TableCell>
                  <TableCell>{exp.production_orders.code}</TableCell>
                  <TableCell>{exp.production_orders.products.name}</TableCell>
                  <TableCell>${(exp.total_cost || 0).toFixed(2)}</TableCell>
                  <TableCell>{new Date(exp.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleExportPDF(exp)}><FileDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleView(exp)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="6" className="text-center">No hay explosiones de materiales para mostrar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingExplosion ? 'Editar Explosión de Materiales' : 'Calcular Nueva Explosión de Materiales'}</DialogTitle>
            <DialogDescription>
              {editingExplosion ? 'Actualiza los detalles.' : 'Selecciona una orden de producción para calcular los materiales requeridos.'}
            </DialogDescription>
          </DialogHeader>
          <MaterialsExplosionForm explosion={editingExplosion} onSuccess={fetchExplosions} closeModal={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default MaterialsExplosionView;