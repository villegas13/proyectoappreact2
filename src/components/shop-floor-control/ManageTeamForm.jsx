import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';

const ManageTeamForm = ({ timerId, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [allEmployees, setAllEmployees] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!timerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('production_timer_employees')
      .select('employee_id, employees(id, full_name)')
      .eq('timer_id', timerId);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el equipo actual.' });
    } else {
      setTeam(data.map(item => item.employees));
    }
    setLoading(false);
  }, [timerId, toast]);

  useEffect(() => {
    const fetchAllEmployees = async () => {
      const { data, error } = await supabase.from('employees').select('id, full_name').eq('status', 'Activo').order('full_name');
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los empleados.' });
      } else {
        setAllEmployees(data);
      }
    };
    
    fetchAllEmployees();
    fetchTeam();
  }, [fetchTeam, toast]);

  const handleAddEmployee = async (employeeId) => {
    if (!employeeId || team.find(e => e.id === employeeId)) return;
    
    setIsSubmitting(true);
    const { error } = await supabase.from('production_timer_employees').insert({
      timer_id: timerId,
      employee_id: employeeId
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo añadir al operario.' });
    } else {
      const employee = allEmployees.find(e => e.id === employeeId);
      setTeam(prev => [...prev, employee]);
      toast({ title: 'Éxito', description: `${employee.full_name} añadido al equipo.` });
    }
    setIsSubmitting(false);
  };

  const handleRemoveEmployee = async (employeeId) => {
    if (team.length <= 1) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'Debe haber al menos un operario en el equipo.' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase
      .from('production_timer_employees')
      .delete()
      .match({ timer_id: timerId, employee_id: employeeId });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo quitar al operario.' });
    } else {
      const employee = team.find(e => e.id === employeeId);
      setTeam(prev => prev.filter(e => e.id !== employeeId));
      toast({ title: 'Éxito', description: `${employee.full_name} quitado del equipo.` });
    }
    setIsSubmitting(false);
  };

  const availableEmployees = allEmployees.filter(emp => !team.some(sel => sel.id === emp.id));

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Equipo Actual</Label>
        <div className="p-2 border rounded-md space-y-2 min-h-[60px]">
          {team.map(emp => (
            <div key={emp.id} className="flex items-center justify-between bg-secondary p-2 rounded">
              <span className="text-sm">{emp.full_name}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveEmployee(emp.id)} disabled={isSubmitting}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Añadir Operario</Label>
        <Select onValueChange={handleAddEmployee} value="" disabled={isSubmitting}>
          <SelectTrigger><SelectValue placeholder="Seleccionar operario para añadir..." /></SelectTrigger>
          <SelectContent>
            {availableEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => { onSuccess(); closeModal(); }}>Cerrar</Button>
      </div>
    </div>
  );
};

export default ManageTeamForm;