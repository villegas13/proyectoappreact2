import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Factory, Play, Square, User, FileText, PlusCircle, ListChecks, Zap, Target, Pause, PlayCircle, Loader2, AlertTriangle, Users } from 'lucide-react';
import ProductionTimerForm from '@/components/shop-floor-control/ProductionTimerForm';
import ProductionLogList from '@/components/shop-floor-control/ProductionLogList';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import NonConformityForm from '@/components/shop-floor-control/NonConformityForm';
import ManageTeamForm from '@/components/shop-floor-control/ManageTeamForm';

const useTimer = (startTime, status, totalStoppedMinutes, endTime) => {
  const [elapsedTime, setElapsedTime] = useState({ hours: '00', minutes: '00', seconds: '00', totalMinutes: 0 });

  useEffect(() => {
    if (!startTime) {
      setElapsedTime({ hours: '00', minutes: '00', seconds: '00', totalMinutes: 0 });
      return;
    }

    const calculateTime = () => {
      const start = new Date(startTime);
      const end = status === 'En Progreso' ? new Date() : new Date(endTime || start);
      const stoppedMillis = (totalStoppedMinutes || 0) * 60 * 1000;
      const diff = end - start - stoppedMillis;

      const totalMinutes = Math.max(0, diff / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const minutes = Math.floor(totalMinutes % 60).toString().padStart(2, '0');
      const seconds = Math.floor((totalMinutes * 60) % 60).toString().padStart(2, '0');

      setElapsedTime({ hours, minutes, seconds, totalMinutes });
    };

    calculateTime();

    if (status === 'En Progreso') {
      const interval = setInterval(calculateTime, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, status, totalStoppedMinutes, endTime]);

  return elapsedTime;
};

const WorkstationCard = ({ workstation, activeTimer, onUpdate }) => {
  const { toast } = useToast();
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isLogListModalOpen, setIsLogListModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isNCModalOpen, setIsNCModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [totalSam, setTotalSam] = useState(0);
  const [totalProduced, setTotalProduced] = useState(0);
  const [unitsToAdd, setUnitsToAdd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const elapsedTime = useTimer(activeTimer?.start_time, activeTimer?.status, activeTimer?.total_stopped_minutes, activeTimer?.end_time);

  const fetchTotalProduced = useCallback(async (timerId) => {
    if (!timerId) {
        setTotalProduced(0);
        return;
    }
    const { data, error } = await supabase
        .from('production_logs')
        .select('produced_units')
        .eq('timer_id', timerId);
    
    if (error) {
        console.error("Error fetching produced units:", error);
        setTotalProduced(0);
    } else {
        const sum = data.reduce((acc, log) => acc + log.produced_units, 0);
        setTotalProduced(sum);
    }
  }, []);

  useEffect(() => {
    const fetchOperationData = async () => {
      if (!activeTimer?.production_orders?.product_id) {
        setTotalSam(0);
        return;
      }
      
      const { data, error } = await supabase.rpc('get_total_sam_for_product', { p_product_id: activeTimer.production_orders.product_id });
      
      if (error) {
        console.error("Error fetching total SAM:", error);
        setTotalSam(0);
      } else {
        setTotalSam(data || 0);
      }
    };

    fetchOperationData();
    if (activeTimer?.id) {
      fetchTotalProduced(activeTimer.id);
    } else {
      setTotalProduced(0);
    }
  }, [activeTimer, fetchTotalProduced]);

  const efficiency = useMemo(() => {
    if (totalSam > 0 && totalProduced > 0 && elapsedTime.totalMinutes > 0) {
      const earnedMinutes = totalProduced * totalSam;
      return (earnedMinutes / elapsedTime.totalMinutes) * 100;
    }
    return 0;
  }, [totalSam, totalProduced, elapsedTime.totalMinutes]);

  const handlePauseProduction = async () => {
    if (!activeTimer || !pauseReason) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from('production_timers')
      .update({ status: 'Pausado', stop_reason: pauseReason, end_time: new Date().toISOString() })
      .eq('id', activeTimer.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo pausar la producción.' });
    } else {
      toast({ title: 'Producción Pausada', description: `Timer detenido. Motivo: ${pauseReason}` });
      onUpdate();
    }
    setIsPauseModalOpen(false);
    setPauseReason('');
    setIsSubmitting(false);
  };

  const handleResumeProduction = async () => {
    if (!activeTimer) return;
    setIsSubmitting(true);
    const stoppedDuration = (new Date() - new Date(activeTimer.end_time)) / (1000 * 60); // minutes
    const newTotalStoppedMinutes = (activeTimer.total_stopped_minutes || 0) + stoppedDuration;

    const { error } = await supabase
      .from('production_timers')
      .update({ status: 'En Progreso', end_time: null, total_stopped_minutes: newTotalStoppedMinutes, stop_reason: null })
      .eq('id', activeTimer.id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo reanudar la producción.' });
    } else {
      toast({ title: 'Producción Reanudada', description: 'El timer ha comenzado de nuevo.' });
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const handleFinishProduction = async () => {
    if (!activeTimer) return;
    if (totalProduced === 0) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No se puede finalizar una producción sin unidades registradas.' });
      return;
    }
    if (!window.confirm('¿Estás seguro de que quieres finalizar la producción en esta estación? Esta acción es irreversible.')) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from('production_timers')
      .update({ status: 'Finalizado', end_time: activeTimer.status === 'Pausado' ? activeTimer.end_time : new Date().toISOString() })
      .eq('id', activeTimer.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo finalizar la producción.' });
    } else {
      toast({ title: 'Producción Finalizada', description: `Se ha detenido el timer para ${workstation.name}.` });
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const handleAddUnits = async () => {
    const units = parseInt(unitsToAdd, 10);
    if (!units || units <= 0) {
      toast({ variant: 'destructive', title: 'Cantidad inválida', description: 'Ingresa un número positivo de unidades.' });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('production_logs').insert({
      timer_id: activeTimer.id,
      log_time: new Date().toISOString(),
      produced_units: units,
      notes: 'Avance rápido'
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo registrar el avance.' });
    } else {
      toast({ title: 'Avance Registrado', description: `${units} unidades añadidas.` });
      setTotalProduced(prev => prev + units);
      setUnitsToAdd('');
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const getStatusBadge = () => {
    if (!activeTimer) return <Badge variant="outline">Libre</Badge>;
    switch (activeTimer.status) {
      case 'En Progreso': return <Badge variant="success">En Producción</Badge>;
      case 'Pausado': return <Badge variant="warning">Pausado</Badge>;
      case 'Finalizado': return <Badge variant="destructive">Finalizado</Badge>;
      default: return <Badge variant="outline">{activeTimer.status}</Badge>;
    }
  };
  
  const getEfficiencyColor = (eff) => {
    if (eff >= 90) return 'text-green-500';
    if (eff >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const progress = activeTimer?.production_orders?.total_quantity > 0 ? (totalProduced / activeTimer.production_orders.total_quantity) * 100 : 0;
  const teamSize = activeTimer?.production_timer_employees?.length || 0;

  return (
    <>
      <motion.div
        layout
        className={`p-4 rounded-xl shadow-lg border flex flex-col justify-between space-y-4`}
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <Factory className="w-8 h-8" style={{ color: 'var(--accent-blue)' }} />
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{workstation.name}</h3>
              <p className="text-sm text-muted-foreground">{workstation.processes.name}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {activeTimer ? (
          <div className="flex-grow space-y-4">
            {/* Operator & OP Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 truncate">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{teamSize} Operario(s)</span>
              </div>
              <div className="flex items-center gap-2 truncate"><FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" /><span className="truncate">{activeTimer.production_orders.code}</span></div>
            </div>

            {/* Production Panel */}
            <div className="p-3 rounded-lg space-y-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">TIEMPO</p>
                  <p className="font-mono font-bold text-xl">{elapsedTime.hours}:{elapsedTime.minutes}:{elapsedTime.seconds}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">EFICIENCIA</p>
                  <p className={`font-mono font-bold text-xl flex items-center justify-center gap-1 ${getEfficiencyColor(efficiency)}`}><Zap className="w-4 h-4"/>{efficiency.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">AVANCE OP</p>
                  <p className="font-mono font-bold text-xl flex items-center justify-center gap-1"><Target className="w-4 h-4 text-green-500"/>{totalProduced}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>{totalProduced} / {activeTimer.production_orders.total_quantity}</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            </div>

            {/* Manual Log */}
            {activeTimer.status !== 'Finalizado' && (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Uds."
                  className="h-10"
                  value={unitsToAdd}
                  onChange={(e) => setUnitsToAdd(e.target.value)}
                  disabled={isSubmitting}
                />
                <Button onClick={handleAddUnits} size="icon" className="h-10 w-12" disabled={isSubmitting || !unitsToAdd}>
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlusCircle className="h-5 w-5" />}
                </Button>
              </div>
            )}

            {/* Main Actions */}
            <div className="space-y-2 pt-2">
              {activeTimer.status !== 'Finalizado' && (
                <Button onClick={handleFinishProduction} variant="destructive" className="w-full" disabled={isSubmitting}>
                  <Square className="w-4 h-4 mr-2" /> Finalizar Producción
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {activeTimer.status === 'En Progreso' && (
                  <Button onClick={() => setIsPauseModalOpen(true)} variant="outline" className="w-full border-orange-500 text-orange-500 hover:bg-orange-500/10 hover:text-orange-600" disabled={isSubmitting}>
                    <Pause className="w-4 h-4 mr-2" /> Pausar
                  </Button>
                )}
                {activeTimer.status === 'Pausado' && (
                  <Button onClick={handleResumeProduction} variant="outline" className="w-full border-green-500 text-green-500 hover:bg-green-500/10 hover:text-green-600" disabled={isSubmitting}>
                    <PlayCircle className="w-4 h-4 mr-2" /> Reanudar
                  </Button>
                )}
                <Button onClick={() => setIsLogListModalOpen(true)} variant="ghost" className="w-full">
                  <ListChecks className="w-4 h-4 mr-2" /> Ver Avances
                </Button>
              </div>
               {activeTimer.status !== 'Finalizado' && (
                <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => setIsTeamModalOpen(true)} variant="outline" className="w-full">
                        <Users className="w-4 h-4 mr-2" /> Gestionar Equipo
                    </Button>
                    <Button onClick={() => setIsNCModalOpen(true)} variant="outline" className="w-full">
                        <AlertTriangle className="w-4 h-4 mr-2" /> Reportar NC
                    </Button>
                </div>
               )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <Button onClick={() => setIsStartModalOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Play className="w-5 h-5 mr-2" /> Iniciar Producción
            </Button>
          </div>
        )}
      </motion.div>

      <Dialog open={isStartModalOpen} onOpenChange={setIsStartModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Iniciar Producción en {workstation.name}</DialogTitle>
          </DialogHeader>
          <ProductionTimerForm
            workstationId={workstation.id}
            onSuccess={() => {
              setIsStartModalOpen(false);
              onUpdate();
            }}
            closeModal={() => setIsStartModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLogListModalOpen} onOpenChange={setIsLogListModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Avances Registrados - {activeTimer?.production_orders.code}</DialogTitle>
          </DialogHeader>
          <ProductionLogList timerId={activeTimer?.id} key={totalProduced} />
        </DialogContent>
      </Dialog>

      <Dialog open={isPauseModalOpen} onOpenChange={setIsPauseModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Pausar Producción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="pause-reason">Motivo de la pausa</Label>
            <Textarea 
              id="pause-reason"
              placeholder="Ej: Falta de material, cambio de referencia, daño en máquina..."
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPauseModalOpen(false)}>Cancelar</Button>
            <Button onClick={handlePauseProduction} disabled={!pauseReason || isSubmitting} className="bg-orange-500 hover:bg-orange-600">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Pausa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isNCModalOpen} onOpenChange={setIsNCModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Reportar No Conformidad</DialogTitle>
          </DialogHeader>
          <NonConformityForm
            timerId={activeTimer?.id}
            onSuccess={() => {
              setIsNCModalOpen(false);
              onUpdate();
            }}
            closeModal={() => setIsNCModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isTeamModalOpen} onOpenChange={setIsTeamModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Gestionar Equipo de Trabajo</DialogTitle>
          </DialogHeader>
          <ManageTeamForm
            timerId={activeTimer?.id}
            onSuccess={() => {
              setIsTeamModalOpen(false);
              onUpdate();
            }}
            closeModal={() => setIsTeamModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WorkstationCard;