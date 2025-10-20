import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Eye, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ProductionOrderForm } from '@/components/planning/production-orders/ProductionOrderForm';
import { generatePDF } from '@/components/planning/production-orders/generateProductionOrderPDF';

const ProductionOrdersView = () => {
  const [productionOrders, setProductionOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const { toast } = useToast();

  const fetchCompanySettings = useCallback(async () => {
    const { data, error } = await supabase.from('erp_settings').select('*').single();
    if (error) {
      console.error('Error fetching company settings:', error);
    } else {
      setCompanySettings(data);
    }
  }, []);

  const fetchProductionOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('production_orders')
      .select('*, products(name, reference)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
    } else {
      setProductionOrders(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchProductionOrders();
    fetchCompanySettings();
  }, [fetchProductionOrders, fetchCompanySettings]);

  const handleAddNew = () => {
    setEditingOrder(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const handleView = (order) => {
    toast({ title: `Visualizando: ${order.code}`, description: 'La vista detallada no está implementada aún. ¡Solicítala!' });
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta orden de producción?')) {
      const { error } = await supabase.from('production_orders').delete().eq('id', orderId);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Éxito', description: 'Orden de producción eliminada.' });
        fetchProductionOrders();
      }
    }
  };
  
  const handleExportPDF = async (order) => {
    toast({ title: 'Generando PDF...', description: 'Por favor espera.' });
    try {
      const { data: items, error: itemsError } = await supabase
        .from('production_order_items')
        .select('*')
        .eq('production_order_id', order.id);

      if (itemsError) throw itemsError;

      generatePDF(order, items, companySettings);
      toast({ title: 'Éxito', description: 'PDF generado y descargado.' });
    } catch(error) {
       toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el PDF.' });
       console.error("PDF generation error:", error);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Listado de Órdenes de Producción</h3>
        <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Nueva OP
        </Button>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código OP</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead>Total Unidades</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando...</TableCell></TableRow>
            ) : productionOrders.length > 0 ? (
              productionOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.code}</TableCell>
                  <TableCell>{order.products?.name || 'N/A'}</TableCell>
                  <TableCell>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{order.total_quantity}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleExportPDF(order)}><FileDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleView(order)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(order)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(order.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="6" className="text-center">No hay órdenes de producción para mostrar.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingOrder ? 'Editar Orden de Producción' : 'Crear Nueva Orden de Producción'}</DialogTitle>
            <DialogDescription>
              {editingOrder ? 'Actualiza los detalles de la OP.' : 'Completa el formulario para crear una nueva OP.'}
            </DialogDescription>
          </DialogHeader>
          <ProductionOrderForm productionOrder={editingOrder} onSuccess={fetchProductionOrders} closeModal={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ProductionOrdersView;