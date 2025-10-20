import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ProductivityForm = ({ record, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employee_id: '',
    production_order_id: '',
    operation_id: '',
    production_date: new Date().toISOString().slice(0, 10),
    produced_units: '',
    shift: 'Día',
  });
  const [employees, setEmployees] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [operations, setOperations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInitialData = useCallback(async () => {
    const { data: empData, error: empError } = await supabase.from('employees').select('id, full_name').eq('status', 'Activo');
    if (empError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los empleados.' });
    else setEmployees(empData);

    const { data: poData, error: poError } = await supabase.from('production_orders').select('id, code').in('status', ['Planificada', 'En Progreso']);
    if (poError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
    else setProductionOrders(poData);
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const fetchOperationsForPO = useCallback(async (poId) => {
    if (!poId) {
      setOperations([]);
      return;
    }
    const { data: po, error: poError } = await supabase.from('production_orders').select('product_id').eq('id', poId).single();
    if (poError || !po) {
      setOperations([]);
      return;
    }

    const { data: sheetItems, error: itemsError } = await supabase
      .from('operation_sheet_items')
      .select('operations(*, operation_standards!left(standard_time))')
      .in('operation_sheet_id', supabase.from('operation_sheets').select('id').eq('product_id', po.product_id));

    if (itemsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las operaciones para esta OP.' });
      setOperations([]);
    } else {
      const ops = sheetItems.map(item => ({
        id: item.operations.id,
        name: item.operations.name,
        sam: item.operations.operation_standards[0]?.standard_time || 0
      }));
      setOperations(ops);
    }
  }, [toast]);

  useEffect(() => {
    if (formData.production_order_id) {
      fetchOperationsForPO(formData.production_order_id);
    }
  }, [formData.production_order_id, fetchOperationsForPO]);

  useEffect(() => {
    if (record) {
      setFormData({
        employee_id: record.employee_id || '',
        production_order_id: record.production_order_id || '',
        operation_id: record.operation_id || '',
        production_date: record.production_date || new Date().toISOString().slice(0, 10),
        produced_units: record.produced_units || '',
        shift: record.shift || 'Día',
      });
    }
  }, [record]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'production_order_id') {
      setFormData(prev => ({ ...prev, operation_id: '' }));
    }
  };

  const calculateEfficiency = async (employeeId, date, producedUnits, operationId) => {
    const { data: attendance, error: attendanceError } = await supabase
      .from('employee_attendance')
      .select('worked_hours')
      .eq('employee_id', employeeId)
      .eq('attendance_date', date)
      .single();

    if (attendanceError || !attendance || !attendance.worked_hours) {
      toast({ variant: 'destructive', title: 'Advertencia', description: 'No se encontró registro de asistencia o horas trabajadas para este empleado en esta fecha. La eficiencia no se puede calcular.' });
      return null;
    }

    const { data: operation, error: operationError } = await supabase
      .from('operations')
      .select('operation_standards!left(standard_time)')
      .eq('id', operationId)
      .single();

    if (operationError || !operation || !operation.operation_standards[0]?.standard_time) {
      toast({ variant: 'destructive', title: 'Advertencia', description: 'No se encontró el SAM para esta operación. La eficiencia no se puede calcular.' });
      return null;
    }

    const availableMinutes = attendance.worked_hours * 60;
    const sam = operation.operation_standards[0].standard_time;
    const earnedMinutes = producedUnits * sam;

    if (availableMinutes <= 0) return 0;

    const efficiency = (earnedMinutes / availableMinutes) * 100;
    return efficiency;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const efficiency = await calculateEfficiency(
        formData.employee_id,
        formData.production_date,
        formData.produced_units,
        formData.operation_id
      );

      const payload = {
        ...formData,
        produced_units: parseInt(formData.produced_units, 10),
        efficiency: efficiency,
      };

      let query;
      if (record) {
        query = supabase.from('employee_production').update(payload).eq('id', record.id);
      } else {
        query = supabase.from('employee_production').insert(payload);
      }

      const { error } = await query;
      if (error) throw error;

      toast({ title: 'Éxito', description: `Registro de producción ${record ? 'actualizado' : 'creado'} correctamente.` });
      onSuccess();
      closeModal();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Empleado</Label>
          <Select onValueChange={(v) => handleSelectChange('employee_id', v)} value={formData.employee_id} required>
            <SelectTrigger><SelectValue placeholder="Selecciona un empleado" /></SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="production_date">Fecha de Producción</Label>
          <Input id="production_date" name="production_date" type="date" value={formData.production_date} onChange={handleInputChange} required />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Orden de Producción (OP)</Label>
          <Select onValueChange={(v) => handleSelectChange('production_order_id', v)} value={formData.production_order_id} required>
            <SelectTrigger><SelectValue placeholder="Selecciona una OP" /></SelectTrigger>
            <SelectContent>
              {productionOrders.map(po => (
                <SelectItem key={po.id} value={po.id}>{po.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Operación Realizada</Label>
          <Select onValueChange={(v) => handleSelectChange('operation_id', v)} value={formData.operation_id} required disabled={!formData.production_order_id || operations.length === 0}>
            <SelectTrigger><SelectValue placeholder={operations.length > 0 ? "Selecciona una operación" : "Selecciona una OP primero"} /></SelectTrigger>
            <SelectContent>
              {operations.map(op => (
                <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="produced_units">Unidades Producidas</Label>
          <Input id="produced_units" name="produced_units" type="number" value={formData.produced_units} onChange={handleInputChange} placeholder="Ej: 150" required />
        </div>
        <div className="space-y-2">
          <Label>Turno</Label>
          <Select onValueChange={(v) => handleSelectChange('shift', v)} value={formData.shift} required>
            <SelectTrigger><SelectValue placeholder="Selecciona un turno" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Día">Día</SelectItem>
              <SelectItem value="Noche">Noche</SelectItem>
              <SelectItem value="Mixto">Mixto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
        </Button>
      </div>
    </form>
  );
};

export default ProductivityForm;