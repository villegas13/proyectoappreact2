import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, ChevronLeft, ChevronRight, Download, ArrowUpDown, CalendarDays, GanttChartSquare, BarChartHorizontal, FilterX, Clock, Trash2 } from 'lucide-react';
import { addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval, isSameDay, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import GanttTaskForm from './gantt/GanttTaskForm';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';

const GanttChart = () => {
  const { toast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'start_time', direction: 'ascending' });
  const [filters, setFilters] = useState({ process: 'all', workstation: 'all', op: 'all' });
  const ganttContainerRef = useRef(null);
  const tableBodyRef = useRef(null);
  const ganttBodyRef = useRef(null);

  const handleScroll = (e) => {
    if (tableBodyRef.current && ganttBodyRef.current) {
      tableBodyRef.current.scrollTop = e.target.scrollTop;
      ganttBodyRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('gantt_tasks').select(`
      id,
      production_order_id,
      workstation_id,
      start_time,
      end_time,
      projected_efficiency,
      required_hours,
      status,
      production_orders ( id, code, total_quantity, products ( name, operation_sheets ( total_sam, total_units_per_hour ))),
      workstations ( id, name, number_of_people, work_shift_group_name, processes ( id, name ))
    `);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos del Gantt.' });
      setTasks([]);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filterOptions = useMemo(() => {
    const processes = [...new Map(tasks.filter(t=>t.workstations?.processes).map(t => [t.workstations.processes.id, t.workstations.processes])).values()];
    const workstations = [...new Map(tasks.filter(t=>t.workstations).map(t => [t.workstations.id, t.workstations])).values()];
    const ops = [...new Map(tasks.filter(t=>t.production_orders).map(t => [t.production_orders.id, t.production_orders])).values()];
    
    const filteredWorkstations = filters.process === 'all'
      ? workstations
      : workstations.filter(w => w.processes.id === filters.process);

    return { processes, workstations: filteredWorkstations, ops };
  }, [tasks, filters.process]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      if (filterName === 'process') {
        newFilters.workstation = 'all';
      }
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({ process: 'all', workstation: 'all', op: 'all' });
  };
  
  const filteredAndSortedTasks = useMemo(() => {
    let filteredTasks = [...tasks];

    if (filters.process !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.workstations?.processes?.id === filters.process);
    }
    if (filters.workstation !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.workstations?.id === filters.workstation);
    }
    if (filters.op !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.production_orders?.id === filters.op);
    }

    if (sortConfig !== null) {
      filteredTasks.sort((a, b) => {
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'process':
            aValue = a.workstations?.processes?.name || '';
            bValue = b.workstations?.processes?.name || '';
            break;
          case 'workstation':
            aValue = a.workstations?.name || '';
            bValue = b.workstations?.name || '';
            break;
          case 'op':
            aValue = a.production_orders?.code || '';
            bValue = b.production_orders?.code || '';
            break;
          default:
            aValue = a[sortConfig.key] || '';
            bValue = b[sortConfig.key] || '';
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return filteredTasks;
  }, [tasks, sortConfig, filters]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };


  const handleDateChange = (amount) => {
    let newDate;
    if (viewMode === 'day') newDate = addDays(currentDate, amount);
    if (viewMode === 'week') newDate = addDays(currentDate, amount * 7);
    if (viewMode === 'month') {
        newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + amount);
    }
    setCurrentDate(newDate);
  };

  const { dateRange, headerText } = useMemo(() => {
    let start, end;
    if (viewMode === 'day') {
        start = currentDate;
        end = currentDate;
    } else if (viewMode === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else { // month
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }
    return {
      dateRange: eachDayOfInterval({ start, end }),
      headerText: format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'd MMMM yyyy', { locale: es })
    };
  }, [viewMode, currentDate]);

  const handleAddTask = () => {
    setEditingTask(null);
    setIsFormDialogOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setIsFormDialogOpen(true);
  };

  const confirmDeleteTask = (task) => {
    setTaskToDelete(task);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    const { error } = await supabase.from('gantt_tasks').delete().eq('id', taskToDelete.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la tarea.' });
    } else {
      toast({ title: 'Éxito', description: 'La tarea ha sido eliminada.' });
      fetchData();
    }
    setIsDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const getTaskStatusColor = (task) => {
    const now = new Date();
    const start = new Date(task.start_time);
    const end = new Date(task.end_time);

    if (now > end) return 'finished';
    if (now >= start && now <= end) return 'in-process';
    return 'pending';
  };
  
  const handleExportPDF = async () => {
    toast({ title: 'Exportando a PDF', description: 'Por favor, espera...' });
    const ganttElement = ganttContainerRef.current;
    if (!ganttElement) return;

    try {
        const canvas = await html2canvas(ganttElement, {
            scale: 2,
            backgroundColor: document.documentElement.classList.contains('dark') ? '#0B3C8A' : '#FFFFFF',
        });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        const tableData = filteredAndSortedTasks.map(t => [
            t.workstations?.processes?.name || 'N/A',
            t.workstations?.name || 'N/A',
            t.production_orders?.code || 'N/A',
            t.production_orders?.products?.name || 'N/A',
            t.production_orders?.total_quantity || 'N/A',
            `${t.projected_efficiency}%`,
            format(new Date(t.start_time), 'dd/MM/yy HH:mm'),
            format(new Date(t.end_time), 'dd/MM/yy HH:mm')
        ]);
        
        pdf.autoTable({
          head: [['Proceso', 'Estación', 'OP', 'Producto', 'Unidades', 'Eficiencia', 'Inicio', 'Fin']],
          body: tableData,
          startY: 40
        });

        pdf.addPage([canvas.width, canvas.height], 'landscape');
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        
        pdf.save(`gantt_${new Date().toISOString().split('T')[0]}.pdf`);
        toast({ title: 'Éxito', description: 'El PDF se ha exportado correctamente.' });

    } catch (error) {
        toast({ variant: 'destructive', title: 'Error de exportación', description: 'No se pudo generar el PDF.' });
    }
  };

  const tableHeaders = [
    { key: 'process', label: 'Proceso' },
    { key: 'workstation', label: 'Estación' },
    { key: 'op', label: 'OP' },
    { key: 'product', label: 'Producto' },
    { key: 'units', label: 'Unidades' },
    { key: 'efficiency', label: 'Eficiencia' },
    { key: 'start_time', label: 'Inicio' },
    { key: 'end_time', label: 'Fin' },
    { key: 'actions', label: 'Acciones' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-[calc(100vh-200px)] flex flex-col"
    >
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={handleAddTask} size="sm" className="bg-accent-purple text-white hover:bg-accent-purple/90 shadow-md hover:shadow-lg transform hover:-translate-y-px">
            <PlusCircle className="w-4 h-4 mr-2" /> Planificar
          </Button>
          <Button onClick={handleExportPDF} size="sm" className="bg-accent-orange text-white hover:bg-accent-orange/90 shadow-md hover:shadow-lg transform hover:-translate-y-px">
            <Download className="w-4 h-4 mr-2" /> Exportar PDF
          </Button>
        </div>
        <div className="flex items-center gap-2 p-1 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <Button variant={viewMode === 'day' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('day')}><CalendarDays className="w-4 h-4 mr-2"/>Día</Button>
          <Button variant={viewMode === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('week')}><GanttChartSquare className="w-4 h-4 mr-2"/>Semana</Button>
          <Button variant={viewMode === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('month')}><BarChartHorizontal className="w-4 h-4 mr-2"/>Mes</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-semibold w-48 text-center capitalize text-lg">{headerText}</span>
          <Button variant="outline" size="icon" onClick={() => handleDateChange(1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
        <Select value={filters.process} onValueChange={(v) => handleFilterChange('process', v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por Proceso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Procesos</SelectItem>
            {filterOptions.processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.workstation} onValueChange={(v) => handleFilterChange('workstation', v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por Estación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Estaciones</SelectItem>
            {filterOptions.workstations.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.op} onValueChange={(v) => handleFilterChange('op', v)}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filtrar por OP" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las OPs</SelectItem>
            {filterOptions.ops.map(o => <SelectItem key={o.id} value={o.id}>{o.code}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <FilterX className="w-4 h-4 mr-2" />
          Limpiar
        </Button>
      </div>
      
      <div className="flex-grow border rounded-xl overflow-hidden card-shadow" style={{backgroundColor: 'var(--bg-secondary)'}}>
        <PanelGroup direction="horizontal">
          <Panel defaultSize={60} minSize={30}>
            <div className="h-full flex flex-col">
              <div className="border-b" style={{borderColor: 'var(--border-accent)'}}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-left">
                      {tableHeaders.map(header => (
                        <th key={header.key} className="p-3 font-semibold text-muted-foreground cursor-pointer hover:bg-muted/50" onClick={() => header.key !== 'actions' && requestSort(header.key)}>
                          <span className="flex items-center gap-2">
                            {header.label}
                            {header.key !== 'actions' && <ArrowUpDown className={cn("w-3 h-3 transition-opacity", sortConfig.key === header.key ? 'opacity-100' : 'opacity-30')}/>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              </div>
              <div ref={tableBodyRef} className="overflow-y-auto flex-grow">
                <table className="w-full text-sm">
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={tableHeaders.length} className="text-center p-8">Cargando...</td></tr>
                    ) : filteredAndSortedTasks.map((task, index) => (
                      <tr key={task.id} className="border-b transition-colors gantt-table-row" style={{height: '50px'}}>
                        <td className="p-3 w-[11%] cursor-pointer" onClick={() => handleEditTask(task)}>{task.workstations?.processes?.name || 'N/A'}</td>
                        <td className="p-3 w-[11%] cursor-pointer" onClick={() => handleEditTask(task)}>{task.workstations?.name || 'N/A'}</td>
                        <td className="p-3 w-[11%] font-semibold cursor-pointer" onClick={() => handleEditTask(task)}>{task.production_orders?.code || 'N/A'}</td>
                        <td className="p-3 w-[11%] cursor-pointer" onClick={() => handleEditTask(task)}>{task.production_orders?.products?.name || 'N/A'}</td>
                        <td className="p-3 w-[11%] text-center cursor-pointer" onClick={() => handleEditTask(task)}>{task.production_orders?.total_quantity || 0}</td>
                        <td className="p-3 w-[11%] text-center font-bold cursor-pointer" onClick={() => handleEditTask(task)}>{task.projected_efficiency}%</td>
                        <td className="p-3 w-[11%] cursor-pointer" onClick={() => handleEditTask(task)}>{format(new Date(task.start_time), 'dd/MM/yy HH:mm')}</td>
                        <td className="p-3 w-[11%] cursor-pointer" onClick={() => handleEditTask(task)}>{format(new Date(task.end_time), 'dd/MM/yy HH:mm')}</td>
                        <td className="p-3 w-[12%] text-center">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); confirmDeleteTask(task); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>
          <PanelResizeHandle className="w-2 bg-border hover:bg-blue-600 active:bg-blue-700 transition-colors" />
          <Panel minSize={30}>
            <div className="h-full flex flex-col">
              <div className="border-b" style={{borderColor: 'var(--border-accent)'}}>
                <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: `repeat(${dateRange.length}, minmax(60px, 1fr))`, height: '50px' }}>
                  {dateRange.map(date => {
                    const isToday = isSameDay(date, new Date());
                    return (
                      <div key={date.toString()} className={cn("text-center border-r py-1 flex flex-col justify-center gantt-header-cell", isToday && 'gantt-header-today')}>
                        <p className="text-xs capitalize font-semibold">{format(date, 'EEE', { locale: es })}</p>
                        <p className="font-bold text-lg">{format(date, 'd')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div ref={ganttBodyRef} onScroll={handleScroll} className="overflow-auto flex-grow relative" style={{ minWidth: dateRange.length * 60 }}>
                {filteredAndSortedTasks.map((task, index) => {
                  const startDate = startOfDay(new Date(task.start_time));
                  const endDate = startOfDay(new Date(task.end_time));
                  const startDayIndex = differenceInDays(startDate, dateRange[0]);
                  const durationDays = differenceInDays(endDate, startDate) + 1;
                  
                  if (startDayIndex + durationDays <= 0 || startDayIndex >= dateRange.length) {
                      return null;
                  }
                  const clampedStart = Math.max(startDayIndex, 0);
                  const clampedDuration = Math.min(durationDays - (clampedStart - startDayIndex), dateRange.length - clampedStart);

                  const status = getTaskStatusColor(task);

                  return (
                      <div key={task.id}
                          style={{
                              position: 'absolute',
                              top: `${index * 50 + 8}px`,
                              left: `${(clampedStart / dateRange.length) * 100}%`,
                              width: `${(clampedDuration / dateRange.length) * 100}%`,
                              height: '34px',
                          }}
                          className="px-1"
                      >
                          <div className={cn("h-full w-full rounded-lg flex items-center justify-between px-2 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md gantt-task-bar", `gantt-task-${status}`)}
                              data-tooltip-id="gantt-tooltip"
                              data-tooltip-html={`
                                  <div style="background-color: var(--bg-secondary); color: var(--text-primary); padding: 8px; border-radius: 8px; box-shadow: var(--shadow-lg);">
                                    <b>OP:</b> ${task.production_orders?.code}<br/>
                                    <b>Producto:</b> ${task.production_orders?.products?.name}<br/>
                                    <b>Personas:</b> ${task.workstations?.number_of_people}<br/>
                                    <b>SAM Total:</b> ${task.production_orders?.products?.operation_sheets[0]?.total_sam || 'N/A'}<br/>
                                    <b>Unid./Hora:</b> ${task.production_orders?.products?.operation_sheets[0]?.total_units_per_hour || 'N/A'}<br/>
                                    <b>Eficiencia:</b> ${task.projected_efficiency}%
                                  </div>
                              `}
                              onClick={() => handleEditTask(task)}
                          >
                              <p className="text-xs font-semibold truncate">{task.production_orders?.code} - {task.production_orders?.products?.name}</p>
                              <div className="flex items-center gap-1 text-xs font-bold whitespace-nowrap ml-2">
                                <Clock size={12} />
                                <span>{task.required_hours?.toFixed(1) || 0}h</span>
                              </div>
                          </div>
                      </div>
                  );
                })}
                <div style={{ height: `${filteredAndSortedTasks.length * 50}px` }}></div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarea de Producción' : 'Planificar Nueva Tarea'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Actualiza los detalles de la tarea.' : 'Completa el formulario para planificar una nueva tarea en el Gantt.'}
            </DialogDescription>
          </DialogHeader>
          <GanttTaskForm task={editingTask} onSuccess={() => { fetchData(); setIsFormDialogOpen(false); }} closeModal={() => setIsFormDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la tarea de producción
              <span className="font-bold"> {taskToDelete?.production_orders?.code}</span> de la planificación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default GanttChart;