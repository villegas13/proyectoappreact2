import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Users, Package, Target, Clock, Info, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductionTimerForm = ({ workstationId, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [allEmployees, setAllEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [balancingInfo, setBalancingInfo] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [opSearch, setOpSearch] = useState('');
  const [loadingBalancing, setLoadingBalancing] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data: empData, error: empError } = await supabase.from('employees').select('id, full_name').eq('status', 'Activo').order('full_name');
      if (empError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los empleados.' });
      else setAllEmployees(empData);
    };
    fetchEmployees();
  }, [toast]);

  const handleSearchOP = async () => {
    if (!opSearch) {
      setProductionOrders([]);
      return;
    }
    const { data: orderData, error: orderError } = await supabase
      .from('production_orders')
      .select('id, code, total_quantity, products(id, name)')
      .eq('status', 'En Proceso')
      .ilike('code', `%${opSearch}%`);
    
    if (orderError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
    } else {
      setProductionOrders(orderData);
      if (orderData.length === 0) {
        toast({ title: 'Sin resultados', description: 'No se encontraron OPs "En Proceso" con ese código.' });
      }
    }
  };

  const fetchBalancingInfo = useCallback(async (productId) => {
    setLoadingBalancing(true);
    setBalancingInfo(null);
    const { data, error } = await supabase
      .from('module_balancing')
      .select(`
        number_of_people,
        units_per_hour,
        module_balancing_operators ( operator_name )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      toast({ variant: 'destructive', title: 'Sin Balanceo', description: 'No se encontró información de balanceo para este producto.' });
    } else {
      setBalancingInfo(data);
    }
    setLoadingBalancing(false);
  }, [toast]);

  const handleOrderSelect = (orderId) => {
    const order = productionOrders.find(o => o.id === orderId);
    setSelectedOrder(order);
    if (order?.products?.id) {
      fetchBalancingInfo(order.products.id);
    }
  };

  const handleAddEmployee = (employeeId) => {
    if (employeeId && !selectedEmployees.find(e => e.id === employeeId)) {
      const employee = allEmployees.find(e => e.id === employeeId);
      setSelectedEmployees([...selectedEmployees, employee]);
    }
  };

  const handleRemoveEmployee = (employeeId) => {
    setSelectedEmployees(selectedEmployees.filter(e => e.id !== employeeId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmployees.length === 0 || !selectedOrder) {
      toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Debes seleccionar al menos un operario y una orden de producción.' });
      return;
    }
    setIsSubmitting(true);

    const timerPayload = {
      workstation_id: workstationId,
      employee_id: selectedEmployees[0].id, // Assign the first employee as the main one
      production_order_id: selectedOrder.id,
      start_time: new Date().toISOString(),
      status: 'En Progreso',
    };

    const { data: timerData, error: timerError } = await supabase.from('production_timers').insert(timerPayload).select().single();

    if (timerError) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo iniciar la producción: ${timerError.message}` });
      setIsSubmitting(false);
      return;
    }

    const timerId = timerData.id;
    // If there are more employees, add them to the junction table
    if (selectedEmployees.length > 1) {
        const employeeLinks = selectedEmployees.map(emp => ({
            timer_id: timerId,
            employee_id: emp.id
        }));

        const { error: employeeError } = await supabase.from('production_timer_employees').insert(employeeLinks);

        if (employeeError) {
            // Rollback timer creation? For now, just notify.
            toast({ variant: 'destructive', title: 'Error Parcial', description: `Timer creado pero no se pudo asignar el equipo completo: ${employeeError.message}` });
        } else {
            toast({ title: 'Producción Iniciada', description: 'El timer ha comenzado con el equipo asignado.' });
            onSuccess();
        }
    } else {
        // Also add the single employee to the junction table for consistency
        const { error: employeeError } = await supabase.from('production_timer_employees').insert({ timer_id: timerId, employee_id: selectedEmployees[0].id });
        if (employeeError) {
             toast({ variant: 'destructive', title: 'Error Parcial', description: `Timer creado pero no se pudo asignar el operario: ${employeeError.message}` });
        } else {
            toast({ title: 'Producción Iniciada', description: 'El timer ha comenzado con el operario asignado.' });
            onSuccess();
        }
    }
    setIsSubmitting(false);
  };

  const availableEmployees = allEmployees.filter(emp => !selectedEmployees.some(sel => sel.id === emp.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Equipo de Trabajo (el primer operario será el principal)</Label>
        <div className="p-2 border rounded-md space-y-2">
          {selectedEmployees.map(emp => (
            <div key={emp.id} className="flex items-center justify-between bg-secondary p-2 rounded">
              <span className="text-sm">{emp.full_name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveEmployee(emp.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Select onValueChange={handleAddEmployee} value="">
            <SelectTrigger><SelectValue placeholder="Añadir operario al equipo..." /></SelectTrigger>
            <SelectContent>
              {availableEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="op_search">Buscar Orden de Producción (En Proceso)</Label>
        <div className="flex gap-2">
          <Input 
            id="op_search"
            placeholder="Escribe el código de la OP..."
            value={opSearch}
            onChange={(e) => setOpSearch(e.target.value)}
          />
          <Button type="button" onClick={handleSearchOP}><Search className="h-4 w-4"/></Button>
        </div>
      </div>

      {productionOrders.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="production_order">Seleccionar Orden de Producción</Label>
          <Select onValueChange={handleOrderSelect}>
            <SelectTrigger id="production_order"><SelectValue placeholder="Seleccionar OP..." /></SelectTrigger>
            <SelectContent>
              {productionOrders.map(order => <SelectItem key={order.id} value={order.id}>{order.code} - {order.products.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg border bg-background/50 space-y-3"
          >
            <h4 className="font-semibold text-lg flex items-center gap-2"><Info className="h-5 w-5 text-blue-500" /> Información de la Orden</h4>
            {loadingBalancing ? <p>Cargando balanceo...</p> : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> <strong>Producto:</strong> {selectedOrder.products.name}</div>
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /> <strong>Cantidad OP:</strong> {selectedOrder.total_quantity}</div>
                {balancingInfo && (
                  <>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> <strong>Uds/Hora:</strong> {balancingInfo.units_per_hour}</div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> <strong>Operarios:</strong> {balancingInfo.number_of_people}</div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || selectedEmployees.length === 0 || !selectedOrder}>{isSubmitting ? 'Iniciando...' : 'Iniciar Producción'}</Button>
      </div>
    </form>
  );
};

export default ProductionTimerForm;