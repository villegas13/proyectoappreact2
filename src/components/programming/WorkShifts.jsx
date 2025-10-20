import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Clock, Calendar, AlertCircle, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const ShiftForm = ({ shiftGroup, onSuccess }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [schedules, setSchedules] = useState([{ days: [], startTime: '', endTime: '', workHours: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  const resetForm = useCallback(() => {
    if (shiftGroup) {
      setName(shiftGroup.name);
      const groupedByTime = shiftGroup.shifts.reduce((acc, shift) => {
        const key = `${shift.start_time}-${shift.end_time}`;
        if (!acc[key]) {
          acc[key] = { days: [], startTime: shift.start_time, endTime: shift.end_time, workHours: shift.work_hours };
        }
        acc[key].days.push(shift.day_of_week);
        return acc;
      }, {});
      setSchedules(Object.values(groupedByTime));
    } else {
      setName('');
      setSchedules([{ days: [], startTime: '', endTime: '', workHours: 0 }]);
    }
  }, [shiftGroup]);

  useEffect(() => {
    resetForm();
  }, [shiftGroup, open, resetForm]);

  const handleScheduleChange = (index, field, value) => {
    const newSchedules = [...schedules];
    newSchedules[index][field] = value;

    if (field === 'startTime' || field === 'endTime') {
      const { startTime, endTime } = newSchedules[index];
      if (startTime && endTime) {
        const start = new Date(`1970-01-01T${startTime}:00`);
        const end = new Date(`1970-01-01T${endTime}:00`);
        if (end > start) {
          const diffMs = end - start;
          const diffHours = diffMs / (1000 * 60 * 60);
          newSchedules[index].workHours = parseFloat(diffHours.toFixed(2));
        } else {
          newSchedules[index].workHours = 0;
        }
      }
    }
    setSchedules(newSchedules);
  };

  const handleDayToggle = (scheduleIndex, day) => {
    const newSchedules = [...schedules];
    const currentDays = newSchedules[scheduleIndex].days;
    if (currentDays.includes(day)) {
      newSchedules[scheduleIndex].days = currentDays.filter(d => d !== day);
    } else {
      newSchedules[scheduleIndex].days.push(day);
    }
    setSchedules(newSchedules);
  };

  const addSchedule = () => {
    setSchedules([...schedules, { days: [], startTime: '', endTime: '', workHours: 0 }]);
  };

  const removeSchedule = (index) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(newSchedules);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!name.trim() || schedules.some(s => s.days.length === 0 || !s.startTime || !s.endTime || s.workHours <= 0)) {
      toast({
        variant: "destructive",
        title: "Error de validación",
        description: "El nombre del turno es obligatorio y cada horario debe tener días, horas válidas."
      });
      setIsSubmitting(false);
      return;
    }

    try {
      if (shiftGroup) {
        const shiftsToDelete = shiftGroup.shifts.map(s => s.id);
        const { error: deleteError } = await supabase.from('work_shifts').delete().in('id', shiftsToDelete);
        if (deleteError) throw deleteError;
      }

      const upsertData = schedules.flatMap(schedule =>
        schedule.days.map(day => ({
          name,
          day_of_week: day,
          start_time: schedule.startTime,
          end_time: schedule.endTime,
          work_hours: schedule.workHours,
        }))
      );

      const { error } = await supabase.from('work_shifts').upsert(upsertData);

      if (error) throw error;

      toast({ title: 'Éxito', description: `Turno ${shiftGroup ? 'actualizado' : 'creado'} correctamente.` });
      onSuccess();
      setOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar el turno: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {shiftGroup ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Crear Turno
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{shiftGroup ? 'Editar' : 'Crear'} Grupo de Turnos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nombre del Grupo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Ej: Turno Mañana Semana 1" />
            </div>

            {schedules.map((schedule, index) => (
              <div key={index} className="p-4 border rounded-lg relative space-y-4">
                {schedules.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeSchedule(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <div>
                  <Label>Días del Horario</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {daysOfWeek.map(day => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`day-${index}-${day}`}
                          checked={schedule.days.includes(day)}
                          onCheckedChange={() => handleDayToggle(index, day)}
                        />
                        <label htmlFor={`day-${index}-${day}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {day.substring(0, 3)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`start-${index}`}>Ingreso</Label>
                    <Input id={`start-${index}`} type="time" value={schedule.startTime} onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor={`end-${index}`}>Salida</Label>
                    <Input id={`end-${index}`} type="time" value={schedule.endTime} onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)} />
                  </div>
                  <div>
                    <Label>Horas</Label>
                    <div className="font-bold text-lg h-10 flex items-center">{schedule.workHours} h</div>
                  </div>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addSchedule}>
              <PlusCircle className="mr-2 h-4 w-4" /> Añadir otro horario
            </Button>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const WorkShifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('work_shifts').select('*').order('created_at', { ascending: false });
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudieron cargar los turnos: ${error.message}` });
    } else {
      setShifts(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleDeleteGroup = async (groupName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar todos los turnos del grupo "${groupName}"?`)) return;
    const { error } = await supabase.from('work_shifts').delete().eq('name', groupName);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar el grupo de turnos: ${error.message}` });
    } else {
      toast({ title: 'Éxito', description: 'Grupo de turnos eliminado correctamente.' });
      fetchShifts();
    }
  };

  const groupedShifts = useMemo(() => {
    const groups = shifts.reduce((acc, shift) => {
      if (!acc[shift.name]) {
        acc[shift.name] = { name: shift.name, shifts: [] };
      }
      acc[shift.name].shifts.push(shift);
      return acc;
    }, {});
    return Object.values(groups);
  }, [shifts]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><p>Cargando turnos...</p></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl card-shadow"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold flex items-center" style={{ color: 'var(--text-primary)' }}>
            <Clock className="w-6 h-6 mr-3 text-blue-400" />
            Gestión de Turnos de Trabajo
          </h3>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Define los horarios laborales para la planificación de la producción.
          </p>
        </div>
        <ShiftForm onSuccess={fetchShifts} />
      </div>

      {groupedShifts.length > 0 ? (
        <div className="space-y-6">
          {groupedShifts.map(group => (
            <div key={group.name} className="rounded-lg border overflow-hidden">
              <div className="p-4 bg-muted/50 flex justify-between items-center">
                <h4 className="font-bold text-lg flex items-center" style={{ color: 'var(--text-primary)' }}>
                  <Calendar className="w-5 h-5 mr-2" /> {group.name}
                </h4>
                <div>
                  <ShiftForm shiftGroup={group} onSuccess={fetchShifts} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteGroup(group.name)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Día</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Horas Laborales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.shifts.map(shift => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.day_of_week}</TableCell>
                      <TableCell>{shift.start_time} - {shift.end_time}</TableCell>
                      <TableCell>{shift.work_hours}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No hay turnos creados</h3>
          <p className="mt-1 text-sm text-muted-foreground">Empieza creando tu primer grupo de turnos.</p>
        </div>
      )}
    </motion.div>
  );
};

export default WorkShifts;