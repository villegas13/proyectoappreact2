import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, Edit, Trash2, Eye, Download } from 'lucide-react';
import ModuleBalancingForm from '@/components/engineering/ModuleBalancingForm';

const ModuleBalancing = () => {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBalance, setEditingBalance] = useState(null);
  const { toast } = useToast();

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('module_balancing')
      .select(`
        id,
        code,
        number_of_people,
        total_sam,
        units_per_hour,
        required_machines,
        product_id,
        products (name, reference)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los balanceos.' });
      console.error(error);
    } else {
      setBalances(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleAddNew = () => {
    setEditingBalance(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (balance) => {
    setEditingBalance(balance);
    setIsDialogOpen(true);
  };

  const handleView = (balance) => {
    toast({ title: "🚧 No implementado", description: "La visualización detallada no está implementada aún. ¡Solicítala!" });
  };
  
  const handleExport = (balance) => {
    toast({ title: "🚧 No implementado", description: "La exportación a PDF no está implementada aún. ¡Solicítala!" });
  };

  const handleDelete = async (balanceId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este balanceo de módulo?')) {
      // Must delete dependencies first: assignments -> operators -> balance
      const { data: operators, error: opError } = await supabase.from('module_balancing_operators').select('id').eq('module_balancing_id', balanceId);
      if (opError) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron encontrar los operarios asociados.' });
        return;
      }
      
      const operatorIds = operators.map(op => op.id);
      
      if(operatorIds.length > 0) {
        const { error: assignError } = await supabase.from('module_balancing_assignments').delete().in('operator_id', operatorIds);
         if (assignError) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron eliminar las asignaciones.' });
            return;
        }

        const { error: operatorsError } = await supabase.from('module_balancing_operators').delete().in('id', operatorIds);
        if (operatorsError) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron eliminar los operarios.' });
            return;
        }
      }

      const { error: balanceError } = await supabase.from('module_balancing').delete().eq('id', balanceId);
      if (balanceError) {
        toast({ variant: 'destructive', title: 'Error', description: balanceError.message });
      } else {
        toast({ title: 'Éxito', description: 'Balanceo de módulo eliminado.' });
        fetchBalances();
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
          Listado de Balanceos de Módulo
        </h3>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Balanceo de Módulo
        </Button>
      </div>

      <div className="p-4 rounded-xl card-shadow" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Personas</TableHead>
              <TableHead>SAM Total (min)</TableHead>
              <TableHead>Unidades/Hora</TableHead>
              <TableHead>Máquinas Req.</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="7" className="text-center">Cargando balanceos...</TableCell></TableRow>
            ) : balances.length > 0 ? (
              balances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell className="font-mono">{balance.code}</TableCell>
                  <TableCell className="font-medium">{balance.products?.name || 'N/A'}</TableCell>
                  <TableCell>{balance.number_of_people}</TableCell>
                  <TableCell>{parseFloat(balance.total_sam).toFixed(4)}</TableCell>
                  <TableCell>{Math.round(balance.units_per_hour)}</TableCell>
                  <TableCell>{balance.required_machines?.toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleView(balance)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(balance)} className="text-blue-500 hover:text-blue-600"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleExport(balance)} className="text-green-500 hover:text-green-600"><Download className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(balance.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan="7" className="text-center">No hay balanceos creados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[95vw] lg:max-w-[80vw] h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingBalance ? 'Editar Balanceo de Módulo' : 'Crear Nuevo Balanceo de Módulo'}</DialogTitle>
            <DialogDescription>
              {editingBalance ? `Actualiza los detalles del balanceo ${editingBalance.code}.` : 'Define un nuevo balanceo para un producto.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 h-full overflow-y-auto">
            <ModuleBalancingForm
              balanceData={editingBalance}
              onSuccess={() => {
                fetchBalances();
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

export default ModuleBalancing;