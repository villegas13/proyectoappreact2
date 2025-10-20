import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AttendanceForm = ({ record, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    employee_id: '',
    attendance_date: new Date().toISOString().slice(0, 10),
    clock_in_time: '',
    clock_out_time: '',
    production_order_id: '',
  });
  const [employees, setEmployees] = useState([]);
  const [productionOrders, setProductionOrders] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDropdownData = useCallback(async () => {
    const { data: empData, error: empError } = await supabase.from('employees').select('id, full_name').eq('status', 'Activo');
    if (empError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los empleados.' });
    else setEmployees(empData);

    const { data: poData, error: poError } = await supabase.from('production_orders').select('id, code').in('status', ['Planificada', 'En Progreso']);
    if (poError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
    else setProductionOrders(poData);
  }, [toast]);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  useEffect(() => {
    if (record) {
      setFormData({
        employee_id: record.employee_id || '',
        attendance_date: record.attendance_date || new Date().toISOString().slice(0, 10),
        clock_in_time: record.clock_in ? new Date(record.clock_in).toTimeString().slice(0, 5) : '',
        clock_out_time: record.clock_out ? new Date(record.clock_out).toTimeString().slice(0, 5) : '',
        production_order_id: record.production_order_id || '',
      });
    }
  }, [record]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateHours = (date, inTime, outTime) => {
    if (!inTime || !outTime) return { worked_hours: 0, overtime_hours: 0, clock_in: null, clock_out: null };

    const clockInDate = new Date(`${date}T${inTime}:00`);
    const clockOutDate = new Date(`${date}T${outTime}:00`);

    if (clockOutDate <= clockInDate) return { worked_hours: 0, overtime_hours: 0, clock_in: clockInDate.toISOString(), clock_out: clockOutDate.toISOString() };

    const diffMs = clockOutDate - clockInDate;
    const workedHours = diffMs / (1000 * 60 * 60);
    
    // Placeholder for shift logic
    const standardWorkHours = 8;
    const overtimeHours = Math.max(0, workedHours - standardWorkHours);

    return {
      worked_hours: workedHours,
      overtime_hours: overtimeHours,
      clock_in: clockInDate.toISOString(),
      clock_out: clockOutDate.toISOString(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { worked_hours, overtime_hours, clock_in, clock_out } = calculateHours(
        formData.attendance_date,
        formData.clock_in_time,
        formData.clock_out_time
      );

      const payload = {
        employee_id: formData.employee_id,
        attendance_date: formData.attendance_date,
        clock_in,
        clock_out,
        worked_hours,
        overtime_hours,
        production_order_id: formData.production_order_id || null,
      };

      let query;
      if (record) {
        query = supabase.from('employee_attendance').update(payload).eq('id', record.id);
      } else {
        query = supabase.from('employee_attendance').insert(payload);
      }

      const { error } = await query;
      if (error) throw error;

      toast({ title: 'Éxito', description: `Registro ${record ? 'actualizado' : 'creado'} correctamente.` });
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="attendance_date">Fecha</Label>
          <Input id="attendance_date" name="attendance_date" type="date" value={formData.attendance_date} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clock_in_time">Hora Entrada</Label>
          <Input id="clock_in_time" name="clock_in_time" type="time" value={formData.clock_in_time} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clock_out_time">Hora Salida</Label>
          <Input id="clock_out_time" name="clock_out_time" type="time" value={formData.clock_out_time} onChange={handleInputChange} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Orden de Producción (OP) Asignada</Label>
        <Select onValueChange={(v) => handleSelectChange('production_order_id', v)} value={formData.production_order_id}>
          <SelectTrigger><SelectValue placeholder="Opcional: Selecciona una OP" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Ninguna</SelectItem>
            {productionOrders.map(po => (
              <SelectItem key={po.id} value={po.id}>{po.code}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

export default AttendanceForm;