import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Eye, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import PurchaseRequisitionForm from '@/components/planning/purchase-requisitions/PurchaseRequisitionForm';
import { generateRequisitionPDF } from '@/components/planning/purchase-requisitions/generateRequisitionPDF';

const statusColors = {
  'Pendiente': 'bg-yellow-500',
  'En revisión': 'bg-blue-500',
  'Cerrado': 'bg-green-500',
  'Cancelado': 'bg-red-500',
};

const PurchaseRequisitionsView = () => {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const { toast } = useToast();

  const fetchCompanySettings = useCallback(async () => {
    const { data, error } = await supabase.from('erp_settings').select('*').single();
    if (error) console.error('Error fetching company settings:', error);
    else setCompanySettings(data);
  }, []);

  const fetchRequisitions = useCallback(async () => {
    setLoading(true);
    const { data: requisitionsData, error } = await supabase
      .from('purchase_requisitions')
      .select('*, production_orders(code)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los requerimientos.' });
      console.error(error);
      setLoading(false);
      return;
    }

    setRequisitions(requisitionsData);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchRequisitions();
    fetchCompanySettings();
  }, [fetchRequisitions, fetchCompanySettings]);

  const handleAddNew = () => {
    setEditingRequisition(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (requisition) => {
    if (requisition.status !== 'Pendiente') {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'Solo se pueden editar requerimientos en estado "Pendiente".' });
      return;
    }
    setEditingRequisition(requisition);
    setIsDialogOpen(true);
  };

  const handleView = (requisition) => {
    toast({ title: `Visualizando: ${requisition.requisition_number}`, description: 'La vista detallada no está implementada aún. ¡Solicítala!' });
  };

  const handleDelete = async (requisitionId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este requerimiento?')) {
      await supabase.from('purchase_requisition_items').delete().eq('purchase_requisition_id', requisitionId);
      const { error } = await supabase.from('purchase_requisitions').delete().eq('id', requisitionId);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Éxito', description: 'Requerimiento eliminado.' });
        fetchRequisitions();
      }
    }
  };

  const handleExportPDF = async (requisition) => {
    toast({ title: 'Generando PDF...', description: 'Por favor espera.' });
    try {
      const { data: items, error: itemsError } = await supabase
        .from('purchase_requisition_items')
        .select('*, inventory_items(name, reference, unit_of_measure), suggested_supplier_id(name)')
        .eq('purchase_requisition_id', requisition.id);

      if (itemsError) throw itemsError;

      generateRequisitionPDF(requisition, items, companySettings);
      toast({ title: 'Éxito', description: 'PDF generado y descargado.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
      console.error("PDF generation error:", error);
    }
  };

  const getRequesterName = (req) => {
    return req.requester_name || 'N/A';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Listado de Requerimientos de Compra</h3>
        <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Requerimiento
        </Button>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Req.</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>OP Asociada</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
            ) : requisitions.length > 0 ? (
              requisitions.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.requisition_number}</TableCell>
                  <TableCell>{new Date(req.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{req.production_orders?.code || 'N/A'}</TableCell>
                  <TableCell>{getRequesterName(req)}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[req.status] || 'bg-gray-500'} text-white`}>{req.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleExportPDF(req)}><FileDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleView(req)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(req)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(req.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="6" className="text-center">No hay requerimientos para mostrar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{editingRequisition ? 'Editar Requerimiento' : 'Crear Nuevo Requerimiento de Compra'}</DialogTitle>
            <DialogDescription>
              {editingRequisition ? 'Actualiza los detalles del requerimiento.' : 'Completa el formulario para generar un nuevo requerimiento.'}
            </DialogDescription>
          </DialogHeader>
          <PurchaseRequisitionForm requisition={editingRequisition} onSuccess={fetchRequisitions} closeModal={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default PurchaseRequisitionsView;