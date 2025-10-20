import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Factory, AlertCircle } from 'lucide-react';
import ProcessItem from './processes/ProcessItem';
import ProcessForm from './processes/ProcessForm';

const ProcessesStations = () => {
  const [processes, setProcesses] = useState([]);
  const [workShifts, setWorkShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProcesses, setExpandedProcesses] = useState({});
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: processesData, error: pError } = await supabase
      .from('processes')
      .select('*, workstations(*)')
      .order('name', { ascending: true });

    const { data: shiftsData, error: sError } = await supabase.from('work_shifts').select('*');

    if (pError || sError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos.' });
    } else {
      setProcesses(processesData);
      setWorkShifts(shiftsData);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteProcess = async (processId) => {
    if (!window.confirm('¿Seguro que quieres eliminar este proceso y todas sus estaciones?')) return;
    const { error } = await supabase.from('processes').delete().eq('id', processId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar el proceso: ${error.message}` });
    } else {
      toast({ title: 'Éxito', description: 'Proceso eliminado.' });
      fetchData();
    }
  };

  const handleDeleteWorkstation = async (workstationId) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta estación de trabajo?')) return;
    const { error } = await supabase.from('workstations').delete().eq('id', workstationId);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo eliminar la estación: ${error.message}` });
    } else {
      toast({ title: 'Éxito', description: 'Estación eliminada.' });
      fetchData();
    }
  };

  const toggleProcess = (processId) => {
    setExpandedProcesses(prev => ({ ...prev, [processId]: !prev[processId] }));
  };

  const shiftMinutesByGroup = useMemo(() => {
    const groups = {};
    workShifts.forEach(shift => {
      if (!groups[shift.name]) {
        groups[shift.name] = 0;
      }
      groups[shift.name] += shift.work_hours * 60;
    });
    return groups;
  }, [workShifts]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><p>Cargando...</p></div>;
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
            <Factory className="w-6 h-6 mr-3 text-blue-400" />
            Gestión de Procesos y Estaciones
          </h3>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            Define la estructura y capacidad de tu planta de producción.
          </p>
        </div>
        <ProcessForm onSuccess={fetchData} />
      </div>

      {workShifts.length === 0 && (
        <div className="mb-4 p-4 border-l-4 border-yellow-400 bg-yellow-50 text-yellow-700 rounded-r-lg">
          <div className="flex">
            <div className="py-1"><AlertCircle className="h-5 w-5 text-yellow-400 mr-3" /></div>
            <div>
              <p className="font-bold">Atención</p>
              <p className="text-sm">No has definido turnos de trabajo. Los cálculos de minutos disponibles no se mostrarán. Ve a la pestaña "Turnos" para crearlos.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {processes.length > 0 ? processes.map(process => (
          <ProcessItem
            key={process.id}
            process={process}
            isExpanded={!!expandedProcesses[process.id]}
            onToggle={() => toggleProcess(process.id)}
            onDeleteProcess={handleDeleteProcess}
            onDeleteWorkstation={handleDeleteWorkstation}
            onSuccess={fetchData}
            workShifts={workShifts}
            shiftMinutesByGroup={shiftMinutesByGroup}
          />
        )) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay procesos creados</h3>
            <p className="mt-1 text-sm text-muted-foreground">Empieza creando tu primer proceso de producción.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProcessesStations;