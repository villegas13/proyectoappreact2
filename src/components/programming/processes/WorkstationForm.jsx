import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, TrendingUp } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WorkstationForm = ({ processId, workstation, onSuccess, workShifts }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [efficiency, setEfficiency] = useState(100);
  const [selectedShiftGroupName, setSelectedShiftGroupName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  const shiftGroups = useMemo(() => {
    const groups = workShifts.reduce((acc, shift) => {
      if (!acc[shift.name]) {
        acc[shift.name] = { name: shift.name, shifts: [] };
      }
      acc[shift.name].shifts.push(shift);
      return acc;
    }, {});
    return Object.values(groups);
  }, [workShifts]);

  useEffect(() => {
    if (open) {
      if (workstation) {
        setName(workstation.name);
        setNumberOfPeople(workstation.number_of_people);
        setEfficiency(workstation.efficiency);
        setSelectedShiftGroupName(workstation.work_shift_group_name || '');
      } else {
        setName('');
        setNumberOfPeople(1);
        setEfficiency(100);
        setSelectedShiftGroupName(shiftGroups.length > 0 ? shiftGroups[0].name : '');
      }
    }
  }, [workstation, open, shiftGroups]);

  const dailyMinutes = useMemo(() => {
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const result = { daily: {}, weeklyTotal: 0 };

    daysOfWeek.forEach(day => result.daily[day] = 0);

    if (!selectedShiftGroupName) return result;

    const selectedGroup = shiftGroups.find(g => g.name === selectedShiftGroupName);
    if (!selectedGroup) return result;

    let weeklyTotal = 0;
    daysOfWeek.forEach(day => {
      const shiftForDay = selectedGroup.shifts.find(s => s.day_of_week === day);
      if (shiftForDay) {
        const dailyEffectiveMinutes = shiftForDay.work_hours * 60 * numberOfPeople * (efficiency / 100);
        result.daily[day] = dailyEffectiveMinutes;
        weeklyTotal += dailyEffectiveMinutes;
      }
    });

    result.weeklyTotal = weeklyTotal;
    return result;
  }, [selectedShiftGroupName, numberOfPeople, efficiency, shiftGroups]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const upsertData = {
      process_id: processId,
      name,
      number_of_people: numberOfPeople,
      efficiency,
      work_shift_group_name: selectedShiftGroupName,
    };

    if (workstation?.id) {
      upsertData.id = workstation.id;
    }

    const { error } = await supabase.from('workstations').upsert(upsertData);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar la estación: ${error.message}` });
    } else {
      toast({ title: 'Éxito', description: `Estación ${workstation ? 'actualizada' : 'creada'} correctamente.` });
      onSuccess();
      setOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {workstation ? (
          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Estación</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{workstation ? 'Editar' : 'Crear'} Estación de Trabajo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Nombre de la Estación</Label>
                <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Máquina de Coser A" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-shift">Turno de Trabajo</Label>
                <Select value={selectedShiftGroupName} onValueChange={setSelectedShiftGroupName}>
                  <SelectTrigger id="ws-shift">
                    <SelectValue placeholder="Selecciona un turno" />
                  </SelectTrigger>
                  <SelectContent>
                    {shiftGroups.map(group => (
                      <SelectItem key={group.name} value={group.name}>{group.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-people">Número de Personas</Label>
                <Input id="ws-people" type="number" min="1" value={numberOfPeople} onChange={(e) => setNumberOfPeople(parseInt(e.target.value, 10) || 1)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ws-efficiency">Eficiencia (%)</Label>
                <div className="flex items-center gap-4">
                  <Slider id="ws-efficiency" value={[efficiency]} onValueChange={(value) => setEfficiency(value[0])} max={120} step={1} />
                  <span className="font-bold w-16 text-center">{efficiency}%</span>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-4 rounded-lg bg-muted/50">
              <h4 className="font-semibold flex items-center"><TrendingUp className="w-5 h-5 mr-2 text-blue-500" /> Minutos Efectivos Calculados</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                {Object.entries(dailyMinutes.daily).map(([day, minutes]) => (
                  <div key={day} className="p-2 rounded bg-background">
                    <p className="text-xs font-medium text-muted-foreground">{day.substring(0,3)}</p>
                    <p className="font-bold text-sm">{minutes.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-center">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Total Semanal</p>
                <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-300">{dailyMinutes.weeklyTotal.toLocaleString('es-ES', { maximumFractionDigits: 0 })} min</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WorkstationForm;