import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Save, Percent, ClipboardList, Factory, Clock, Calendar, Hash, Zap, ClipboardCheck } from 'lucide-react';
import { format, addDays, parseISO, setHours, setMinutes, setSeconds, setMilliseconds, addHours, getDay } from 'date-fns';

const GanttTaskForm = ({ task, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    production_order_id: '',
    workstation_id: '',
    projected_efficiency: 100,
    start_time: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    work_shift_id: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [allData, setAllData] = useState({
    productionOrders: [],
    processes: [],
    workstations: [],
    moduleBalancings: [],
    workShifts: [],
  });
  const [selectedProcessId, setSelectedProcessId] = useState('');

  const fetchData = useCallback(async () => {
    const { data: productionOrders, error: poError } = await supabase.from('production_orders').select('id, code, total_quantity, product_id, products(name)');
    const { data: processes, error: pError } = await supabase.from('processes').select('id, name');
    const { data: workstations, error: wsError } = await supabase.from('workstations').select('id, name, process_id, efficiency, work_shift_group_name');
    const { data: moduleBalancings, error: mbError } = await supabase.from('module_balancing').select('product_id, units_per_hour');
    const { data: workShifts, error: shiftsError } = await supabase.from('work_shifts').select('id, name, work_hours, day_of_week, start_time, end_time');

    if (poError || pError || wsError || mbError || shiftsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos necesarios.' });
    } else {
      setAllData({ productionOrders, processes, workstations, moduleBalancings, workShifts });
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (task) {
      const ws = allData.workstations.find(w => w.id === task.workstation_id);
      if (ws) {
        setSelectedProcessId(ws.process_id);
      }
      
      const relatedShift = allData.workShifts.find(s => s.name === task.workstations?.work_shift_group_name);
      
      setFormData(f => ({
        ...f,
        production_order_id: task.production_order_id || '',
        workstation_id: task.workstation_id || '',
        projected_efficiency: task.projected_efficiency || 100,
        start_time: task.start_time ? format(new Date(task.start_time), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        work_shift_id: task.gantt_task_id ? '' : (relatedShift?.id || '')
      }));
    }
  }, [task, allData.workstations, allData.workShifts]);
  
  const { requiredHours, unitsPerHour, opUnits, endTime, requiredShifts } = useMemo(() => {
    const initialResult = { requiredHours: 0, unitsPerHour: 0, opUnits: 0, endTime: new Date(formData.start_time), requiredShifts: 0 };
    if (!formData.production_order_id) return initialResult;

    const op = allData.productionOrders.find(o => o.id === formData.production_order_id);
    if (!op) return initialResult;

    const balancing = allData.moduleBalancings.find(b => b.product_id === op.product_id);
    const uPh = balancing?.units_per_hour || 1;
    const opU = op.total_quantity || 0;
    const efficiencyFactor = (formData.projected_efficiency || 100) / 100;

    const hours = uPh > 0 ? (opU / uPh) / efficiencyFactor : 0;

    let calculatedEndTime = new Date(new Date(formData.start_time).getTime() + hours * 60 * 60 * 1000);
    let shifts = 0;

    if (formData.work_shift_id) {
        const shift = allData.workShifts.find(s => s.id === formData.work_shift_id);
        if (shift && shift.work_hours > 0) {
            shifts = hours / shift.work_hours;
            
            let remainingHours = hours;
            let currentDay = new Date(formData.start_time);
            
            const dayMap = { 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6, 'Domingo': 0 };
            const shiftDays = allData.workShifts
                .filter(s => s.name === shift.name)
                .map(s => dayMap[s.day_of_week]);

            while (remainingHours > 0) {
                if (shiftDays.includes(getDay(currentDay))) {
                    const dayShift = allData.workShifts.find(s => s.name === shift.name && dayMap[s.day_of_week] === getDay(currentDay));
                    if (dayShift) {
                        const [startHour, startMinute] = dayShift.start_time.split(':').map(Number);
                        const [endHour, endMinute] = dayShift.end_time.split(':').map(Number);

                        let shiftStart = setMilliseconds(setSeconds(setMinutes(setHours(currentDay, startHour), startMinute), 0), 0);
                        let shiftEnd = setMilliseconds(setSeconds(setMinutes(setHours(currentDay, endHour), endMinute), 0), 0);

                        if (currentDay < shiftStart) {
                            currentDay = shiftStart;
                        }

                        if (currentDay < shiftEnd) {
                            const availableHours = (shiftEnd - currentDay) / (1000 * 60 * 60);
                            const hoursToWork = Math.min(remainingHours, availableHours);
                            
                            currentDay = addHours(currentDay, hoursToWork);
                            remainingHours -= hoursToWork;
                        }
                    }
                }

                if (remainingHours > 0) {
                    currentDay = addDays(currentDay, 1);
                    const nextShiftDay = allData.workShifts.find(s => s.name === shift.name && dayMap[s.day_of_week] === getDay(currentDay));
                    const [startHour, startMinute] = (nextShiftDay?.start_time || shift.start_time).split(':').map(Number);
                    currentDay = setMilliseconds(setSeconds(setMinutes(setHours(currentDay, startHour), startMinute), 0), 0);
                }
            }
            calculatedEndTime = currentDay;
        }
    }

    return { requiredHours: hours, unitsPerHour: uPh, opUnits: opU, endTime: calculatedEndTime, requiredShifts: shifts };
  }, [formData.production_order_id, formData.projected_efficiency, formData.start_time, formData.work_shift_id, allData]);


  const filteredWorkstations = useMemo(() => {
    return allData.workstations.filter(ws => ws.process_id === selectedProcessId);
  }, [selectedProcessId, allData.workstations]);

  const handleAutoSetShift = () => {
    if(formData.workstation_id) {
      const ws = allData.workstations.find(w => w.id === formData.workstation_id);
      if(ws && ws.work_shift_group_name) {
        const shift = allData.workShifts.find(s => s.name === ws.work_shift_group_name);
        if (shift) {
          setFormData(f => ({ ...f, work_shift_id: shift.id }));
          toast({ title: 'Turno Automático', description: `Se asignó el turno "${shift.name}" de la estación.` });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'No se encontró un turno coincidente para esta estación.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'La estación no tiene un turno asignado.' });
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona una estación primero.' });
    }
  };


  const handleProcessChange = (processId) => {
    setSelectedProcessId(processId);
    setFormData(f => ({ ...f, workstation_id: '', work_shift_id: '' }));
  };

  const handleWorkstationChange = (workstationId) => {
    const ws = allData.workstations.find(w => w.id === workstationId);
    setFormData(f => ({ ...f, workstation_id: workstationId, projected_efficiency: ws?.efficiency || 100, work_shift_id: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      status: 'pending',
      required_hours: requiredHours,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: endTime.toISOString(),
    };

    if (task?.id) {
      payload.id = task.id;
    } else {
      delete payload.id;
    }

    try {
      const { error } = await supabase.from('gantt_tasks').upsert(payload);
      if (error) throw error;

      toast({ title: 'Éxito', description: `Tarea ${task ? 'actualizada' : 'creada'} correctamente.` });
      onSuccess();
      closeModal();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="process"><Factory className="inline-block w-4 h-4 mr-1" /> Proceso</Label>
          <Select value={selectedProcessId} onValueChange={handleProcessChange}>
            <SelectTrigger id="process"><SelectValue placeholder="Seleccionar proceso..." /></SelectTrigger>
            <SelectContent>
              {allData.processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workstation"><Clock className="inline-block w-4 h-4 mr-1" /> Estación de Trabajo</Label>
          <Select value={formData.workstation_id} onValueChange={handleWorkstationChange} disabled={!selectedProcessId}>
            <SelectTrigger id="workstation"><SelectValue placeholder="Seleccionar estación..." /></SelectTrigger>
            <SelectContent>
              {filteredWorkstations.map(ws => <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="production_order"><ClipboardList className="inline-block w-4 h-4 mr-1" /> Orden de Producción</Label>
          <Select value={formData.production_order_id} onValueChange={(val) => setFormData(f => ({ ...f, production_order_id: val }))}>
            <SelectTrigger id="production_order"><SelectValue placeholder="Seleccionar OP..." /></SelectTrigger>
            <SelectContent>
              {allData.productionOrders.map(op => (
                <SelectItem key={op.id} value={op.id}>{op.code} - {op.products.name} ({op.total_quantity}u)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
         <div className="space-y-2 md:col-span-2">
          <Label htmlFor="work_shift_id">Turno de Trabajo</Label>
          <div className="flex gap-2">
            <Select value={formData.work_shift_id} onValueChange={(val) => setFormData(f => ({ ...f, work_shift_id: val }))}>
              <SelectTrigger id="work_shift_id"><SelectValue placeholder="Seleccionar turno..." /></SelectTrigger>
              <SelectContent>
                {allData.workShifts.filter((v,i,a)=>a.findIndex(t=>(t.name === v.name))===i).map(shift => <SelectItem key={shift.id} value={shift.id}>{shift.name} ({shift.work_hours}h)</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" onClick={handleAutoSetShift} title="Auto-asignar turno de estación">
                <Zap className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="start_time"><Calendar className="inline-block w-4 h-4 mr-1" /> Fecha/Hora de Inicio</Label>
          <Input id="start_time" type="datetime-local" value={formData.start_time} onChange={(e) => setFormData(f => ({ ...f, start_time: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projected_efficiency"><Percent className="inline-block w-4 h-4 mr-1" /> Eficiencia Proyectada</Label>
          <div className="flex items-center gap-4">
            <Slider id="projected_efficiency" value={[formData.projected_efficiency]} onValueChange={(val) => setFormData(f => ({ ...f, projected_efficiency: val[0] }))} max={120} step={1} />
            <span className="font-bold w-16 text-center">{formData.projected_efficiency}%</span>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-lg bg-muted/50 space-y-2">
        <h4 className="font-semibold">Resumen de Cálculo</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Hash size={12}/> Unidades OP</p>
            <p className="font-bold text-lg">{opUnits}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock size={12}/> Unidades/Hora</p>
            <p className="font-bold text-lg">{unitsPerHour.toFixed(2)}</p>
          </div>
          <div className="text-blue-600 dark:text-blue-400">
            <p className="text-xs">Tiempo Requerido</p>
            <p className="font-bold text-lg">{requiredHours.toFixed(2)}h</p>
          </div>
          <div className="text-purple-600 dark:text-purple-400">
            <p className="text-xs flex items-center justify-center gap-1"><ClipboardCheck size={12}/> Turnos Requeridos</p>
            <p className="font-bold text-lg">{requiredShifts.toFixed(2)}</p>
          </div>
          <div className="text-green-600 dark:text-green-400">
            <p className="text-xs">Fecha Fin Calculada</p>
            <p className="font-bold text-lg">{format(endTime, 'dd/MM/yy HH:mm')}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
          <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Guardando...' : (task ? 'Actualizar Tarea' : 'Crear Tarea')}
        </Button>
      </div>
    </form>
  );
};

export default GanttTaskForm;