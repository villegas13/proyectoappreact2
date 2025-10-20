import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Trash2, Factory, CalendarDays, Users, Percent, Clock } from 'lucide-react';
import ProcessForm from './ProcessForm';
import WorkstationForm from './WorkstationForm';

const ProcessItem = ({ process, isExpanded, onToggle, onDeleteProcess, onDeleteWorkstation, onSuccess, workShifts, shiftMinutesByGroup }) => {
  const totalMinutes = process.workstations.reduce((total, ws) => {
    const totalShiftMinutes = shiftMinutesByGroup[ws.work_shift_group_name] || 0;
    return total + (totalShiftMinutes * ws.number_of_people * (ws.efficiency / 100));
  }, 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="p-4 flex justify-between items-center cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          <span className="font-bold text-lg">{process.name}</span>
          <span className="text-sm text-muted-foreground">{process.description}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm font-semibold">{totalMinutes.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
            <p className="text-xs text-muted-foreground">Minutos/Semana Efectivos</p>
          </div>
          <div>
            <ProcessForm process={process} onSuccess={onSuccess} />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); onDeleteProcess(process.id); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/20"
          >
            <div className="p-4">
              <div className="flex justify-end mb-4">
                <WorkstationForm processId={process.id} onSuccess={onSuccess} workShifts={workShifts} />
              </div>
              {process.workstations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Factory className="inline-block w-4 h-4 mr-1" /> Estación</TableHead>
                      <TableHead><CalendarDays className="inline-block w-4 h-4 mr-1" /> Turno</TableHead>
                      <TableHead><Users className="inline-block w-4 h-4 mr-1" /> Personas</TableHead>
                      <TableHead><Percent className="inline-block w-4 h-4 mr-1" /> Eficiencia</TableHead>
                      <TableHead><Clock className="inline-block w-4 h-4 mr-1" /> Minutos/Semana</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {process.workstations.map(ws => {
                      const totalShiftMinutes = shiftMinutesByGroup[ws.work_shift_group_name] || 0;
                      const stationMinutes = totalShiftMinutes * ws.number_of_people * (ws.efficiency / 100);
                      return (
                        <TableRow key={ws.id}>
                          <TableCell className="font-medium">{ws.name}</TableCell>
                          <TableCell>{ws.work_shift_group_name}</TableCell>
                          <TableCell>{ws.number_of_people}</TableCell>
                          <TableCell>{ws.efficiency}%</TableCell>
                          <TableCell>{stationMinutes.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</TableCell>
                          <TableCell className="text-right">
                            <WorkstationForm processId={process.id} workstation={ws} onSuccess={onSuccess} workShifts={workShifts} />
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => onDeleteWorkstation(ws.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-4">No hay estaciones de trabajo en este proceso.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProcessItem;