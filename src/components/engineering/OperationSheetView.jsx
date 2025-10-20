import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Eye } from 'lucide-react';
import { OperationSheetForm } from '@/components/engineering/OperationSheetForm';

const OperationSheetView = () => {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState(null);
  const { toast } = useToast();

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('operation_sheets')
      .select(`
        id,
        total_sam,
        total_units_per_hour,
        products (id, name, reference),
        operation_sheet_items (count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las hojas de operaciones.' });
      console.error(error);
    } else {
      setSheets(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const handleAddNew = () => {
    setEditingSheet(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (sheet) => {
    setEditingSheet(sheet);
    setIsDialogOpen(true);
  };
  
  const handleView = (sheet) => {
    toast({ title: "🚧 No implementado", description: "La visualización no está implementada aún. ¡Solicítala!" });
  };

  const handleDelete = async (sheetId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta hoja de operaciones?')) {
      // First delete related items
      const { error: itemsError } = await supabase.from('operation_sheet_items').delete().eq('operation_sheet_id', sheetId);
      if (itemsError) {
        toast({ variant: 'destructive', title: 'Error', description: `No se pudieron eliminar las operaciones asociadas: ${itemsError.message}` });
        return;
      }
      
      // Then delete the sheet itself
      const { error: sheetError } = await supabase.from('operation_sheets').delete().eq('id', sheetId);
      if (sheetError) {
        toast({ variant: 'destructive', title: 'Error', description: sheetError.message });
      } else {
        toast({ title: 'Éxito', description: 'Hoja de operaciones eliminada.' });
        fetchSheets();
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Listado de Hojas de Operaciones
        </h3>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Hoja de Operaciones
        </Button>
      </div>

      <div className="p-4 rounded-xl card-shadow" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead># de Operaciones</TableHead>
              <TableHead>SAM Total (min)</TableHead>
              <TableHead>Unidades/Hora</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="5" className="text-center">Cargando hojas de operaciones...</TableCell></TableRow>
            ) : sheets.length > 0 ? (
              sheets.map((sheet) => (
                <TableRow key={sheet.id}>
                  <TableCell className="font-medium">{sheet.products?.name || 'N/A'} ({sheet.products?.reference || 'N/A'})</TableCell>
                  <TableCell>{sheet.operation_sheet_items[0]?.count || 0}</TableCell>
                  <TableCell>{parseFloat(sheet.total_sam).toFixed(4)}</TableCell>
                  <TableCell>{Math.round(sheet.total_units_per_hour)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleView(sheet)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(sheet)} className="text-blue-500 hover:text-blue-600"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(sheet.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="5" className="text-center">No hay hojas de operaciones creadas.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingSheet ? 'Editar Hoja de Operaciones' : 'Crear Nueva Hoja de Operaciones'}</DialogTitle>
            <DialogDescription>
              {editingSheet ? 'Actualiza los detalles de la hoja de operaciones.' : 'Selecciona un producto y añade las operaciones para construir la hoja.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <OperationSheetForm
              sheetData={editingSheet}
              onSuccess={() => {
                fetchSheets();
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

export default OperationSheetView;