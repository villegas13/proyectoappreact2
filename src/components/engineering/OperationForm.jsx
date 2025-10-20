import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Percent, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const OperationForm = ({ operationData, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    process_id: null,
    machine: '',
    description: '',
    cost_center_id: null,
  });
  const [processes, setProcesses] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  
  const [timeMeasurements, setTimeMeasurements] = useState(Array(5).fill(''));
  const [valuation, setValuation] = useState(100);
  const [supplement, setSupplement] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [standardId, setStandardId] = useState(null);

  useEffect(() => {
    const fetchRelatedData = async () => {
      const { data: processesData, error: pError } = await supabase.from('processes').select('*');
      if (!pError) setProcesses(processesData);

      const { data: centersData, error: cError } = await supabase.from('cost_centers').select('id, name').eq('status', 'Activo');
      if (!cError) setCostCenters(centersData);
    };
    fetchRelatedData();
  }, []);
  
  useEffect(() => {
    const loadOperationData = () => {
        if (operationData) {
            setFormData({
                code: operationData.code || '',
                name: operationData.name || '',
                process_id: operationData.process_id || null,
                machine: operationData.machine || '',
                description: operationData.description || '',
                cost_center_id: operationData.cost_center_id || null,
            });

            const std = operationData.operation_standards?.[0];
            if (std) {
                setStandardId(std.id);
                setValuation(std.valuation_factor ? std.valuation_factor * 100 : 100);
                setSupplement(std.supplement_factor ? std.supplement_factor * 100 : 15);
            } else {
                setStandardId(null);
                setValuation(100);
                setSupplement(15);
            }
            
            const measurements = operationData.time_measurements || [];
            if (measurements.length > 0) {
                const times = measurements.map(m => m.time_value);
                setTimeMeasurements(times);
            } else {
                setTimeMeasurements(Array(5).fill(''));
            }

        } else {
            setFormData({ code: '', name: '', process_id: null, machine: '', description: '', cost_center_id: null });
            setTimeMeasurements(Array(5).fill(''));
            setValuation(100);
            setSupplement(15);
            setStandardId(null);
        }
    };
    loadOperationData();
  }, [operationData]);

  const handleTimeChange = (index, value) => {
    const newTimes = [...timeMeasurements];
    newTimes[index] = value;
    setTimeMeasurements(newTimes);
  };

  const addTimeMeasurement = () => {
    if (timeMeasurements.length < 10) {
      setTimeMeasurements([...timeMeasurements, '']);
    } else {
      toast({
        title: 'Límite alcanzado',
        description: 'No puedes añadir más de 10 mediciones de tiempo.',
        variant: 'destructive'
      });
    }
  };

  const removeTimeMeasurement = (index) => {
    const newTimes = timeMeasurements.filter((_, i) => i !== index);
    setTimeMeasurements(newTimes);
  };

  const { averageTime, valuedTime, standardTime, validTimesCount } = useMemo(() => {
    const validTimes = timeMeasurements.map(t => parseFloat(t)).filter(t => !isNaN(t) && t > 0);
    if (validTimes.length === 0) {
      return { averageTime: 0, valuedTime: 0, standardTime: 0, validTimesCount: 0 };
    }
    const sum = validTimes.reduce((acc, time) => acc + time, 0);
    const avgTime = sum / validTimes.length;
    const valTime = avgTime * (parseFloat(valuation) / 100);
    const stdTime = valTime * (1 + parseFloat(supplement) / 100);
    return { averageTime: avgTime, valuedTime: valTime, standardTime: stdTime, validTimesCount: validTimes.length };
  }, [timeMeasurements, valuation, supplement]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validTimesCount === 0) {
      toast({
        variant: 'destructive',
        title: 'Validación fallida',
        description: 'Debes ingresar al menos una medición de tiempo válida.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
        let query = supabase
            .from('operations')
            .select('id', { count: 'exact' })
            .eq('code', formData.code);
        
        if (operationData?.id) {
            query = query.neq('id', operationData.id);
        }

        const { count, error: checkError } = await query;

        if (checkError) {
            throw checkError;
        }

        if (count > 0) {
            toast({
                variant: 'destructive',
                title: 'Código duplicado',
                description: `El código "${formData.code}" ya está en uso. Por favor, elige otro.`,
            });
            setIsSubmitting(false);
            return;
        }

        const payload = {
            ...formData,
            process_id: formData.process_id || null,
            cost_center_id: formData.cost_center_id || null,
        };

        let savedOperation;
        if (operationData) {
            const { data, error } = await supabase
                .from('operations')
                .update(payload)
                .eq('id', operationData.id)
                .select()
                .single();
            if (error) throw error;
            savedOperation = data;
        } else {
            const { data, error } = await supabase
                .from('operations')
                .insert(payload)
                .select()
                .single();
            if (error) {
                if (error.code === '23505') {
                    toast({
                        variant: 'destructive',
                        title: 'Error de duplicado',
                        description: 'El código de operación ya existe. Por favor, usa uno diferente.',
                    });
                    setIsSubmitting(false);
                    return;
                }
                throw error;
            }
            savedOperation = data;
        }

        const operationId = savedOperation.id;
        
        const standardPayload = {
            operation_id: operationId,
            average_time: Number(averageTime.toFixed(4)),
            valuation_factor: parseFloat(valuation) / 100,
            supplement_factor: parseFloat(supplement) / 100,
            standard_time: Number(standardTime.toFixed(4)),
        };
        
        if (standardId) {
            standardPayload.id = standardId;
        }

        const { error: stdError } = await supabase.from('operation_standards').upsert(standardPayload, { onConflict: 'operation_id' });
        if (stdError) throw stdError;

        await supabase.from('time_measurements').delete().eq('operation_id', operationId);
        const validTimes = timeMeasurements.map(t => parseFloat(t)).filter(t => !isNaN(t) && t > 0);
        if (validTimes.length > 0) {
            const measurementsToSave = validTimes.map((time, index) => ({
                operation_id: operationId,
                measurement_number: index + 1,
                time_value: time
            }));
            const { error: tmError } = await supabase.from('time_measurements').insert(measurementsToSave);
            if(tmError) throw tmError;
        }

        toast({ title: 'Éxito', description: `Operación ${operationData ? 'actualizada' : 'creada'} correctamente.` });
        onSuccess();
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="op-code">Código</Label>
            <Input id="op-code" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="Ej: OP-C-01" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-name">Nombre</Label>
            <Input id="op-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Ej: Coser cuello" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="op-process">Proceso</Label>
            <Select value={formData.process_id || ''} onValueChange={(value) => setFormData({...formData, process_id: value || null})}>
                <SelectTrigger id="op-process"><SelectValue placeholder="Seleccionar proceso..." /></SelectTrigger>
                <SelectContent>
                    {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="op-machine">Máquina</Label>
            <Input id="op-machine" value={formData.machine} onChange={(e) => setFormData({...formData, machine: e.target.value})} placeholder="Ej: Plana 1 aguja" />
          </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="op-cost-center">Centro de Costo</Label>
            <Select value={formData.cost_center_id || ''} onValueChange={(value) => setFormData({...formData, cost_center_id: value || null})}>
                <SelectTrigger id="op-cost-center"><SelectValue placeholder="Asignar centro de costo..." /></SelectTrigger>
                <SelectContent>
                    {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        
        <div className="pt-4 space-y-4">
           <Label>Cálculo de Tiempo Estándar</Label>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label htmlFor="valuation">Factor de Valoración (%)</Label>
                  <div className="relative">
                      <Input id="valuation" type="number" value={valuation} onChange={e => setValuation(e.target.value)} className="pr-8" />
                      <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
              </div>
              <div className="space-y-2">
                  <Label htmlFor="supplement">Suplemento (%)</Label>
                  <div className="relative">
                      <Input id="supplement" type="number" value={supplement} onChange={e => setSupplement(e.target.value)} className="pr-8" />
                      <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
              </div>
           </div>
           <div className="grid grid-cols-3 gap-3 text-center p-3 rounded-lg" style={{backgroundColor: 'var(--bg-primary)'}}>
               <div>
                   <p className="text-xs text-muted-foreground">Promedio (min)</p>
                   <p className="font-bold text-lg">{averageTime.toFixed(4)}</p>
               </div>
               <div>
                   <p className="text-xs text-muted-foreground">Tiempo Valorado (min)</p>
                   <p className="font-bold text-lg">{valuedTime.toFixed(4)}</p>
               </div>
               <div>
                   <p className="text-xs text-muted-foreground">Tiempo Estándar (min)</p>
                   <p className="font-bold text-lg text-blue-500">{standardTime.toFixed(4)}</p>
               </div>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Mediciones de Tiempo (minutos)</Label>
          <Button type="button" variant="outline" size="sm" onClick={addTimeMeasurement}>
            <PlusCircle className="h-4 w-4 mr-2" /> Añadir
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">#</TableHead>
                <TableHead>Tiempo (min)</TableHead>
                <TableHead className="text-right w-[50px]">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeMeasurements.map((time, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.0001"
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      placeholder="0.0000"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTimeMeasurement(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <div className="lg:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
              <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Guardando...' : 'Guardar Operación'}
          </Button>
      </div>
    </form>
  );
};