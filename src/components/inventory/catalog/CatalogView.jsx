import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CatalogItemForm from '@/components/inventory/catalog/CatalogItemForm';

const CatalogView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*, main_supplier:main_supplier_id(name), alternate_supplier:alternate_supplier_id(name)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ítems del catálogo." });
      console.error(error);
    } else {
      setItems(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddNew = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este ítem? Esta acción no se puede deshacer.')) {
      const { error } = await supabase.from('inventory_items').delete().eq('id', itemId);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar el ítem: ${error.message}` });
      } else {
        toast({ title: "Éxito", description: "Ítem eliminado del catálogo." });
        fetchItems();
      }
    }
  };

  const itemTypeMap = {
    materia_prima: 'Materia Prima',
    insumo: 'Insumo',
    producto_en_proceso: 'Producto en Proceso',
    producto_terminado: 'Producto Terminado',
    servicio_tercerizado: 'Servicio Tercerizado'
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Catálogo Maestro de Ítems</h3>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ítem
        </Button>
      </div>

      <div className="rounded-lg border shadow-sm" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold text-gray-600">Referencia</TableHead>
              <TableHead className="font-bold text-gray-600">Nombre</TableHead>
              <TableHead className="font-bold text-gray-600">Tipo</TableHead>
              <TableHead className="font-bold text-gray-600">Stock Actual</TableHead>
              <TableHead className="font-bold text-gray-600">U.M.</TableHead>
              <TableHead className="font-bold text-gray-600">Costo Estándar</TableHead>
              <TableHead className="text-right font-bold text-gray-600">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="7" className="text-center">Cargando...</TableCell></TableRow>
            ) : items.length > 0 ? (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <TableCell className="font-medium">{item.reference}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{itemTypeMap[item.item_type] || item.item_type}</TableCell>
                  <TableCell>{item.current_stock || 0}</TableCell>
                  <TableCell>{item.unit_of_measure}</TableCell>
                  <TableCell>${(item.standard_cost || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-sky-500 hover:text-sky-600"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="7" className="text-center">No hay ítems en el catálogo.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{editingItem ? 'Editar Ítem del Catálogo' : 'Crear Nuevo Ítem'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Actualiza los detalles del ítem.' : 'Completa el formulario para añadir un nuevo ítem al catálogo.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CatalogItemForm 
              item={editingItem} 
              onSuccess={() => {
                fetchItems();
                setIsDialogOpen(false);
              }} 
              closeModal={() => setIsDialogOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CatalogView;