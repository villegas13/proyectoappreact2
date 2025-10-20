import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { Calendar, Hash, AlertTriangle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const KanbanTask = ({ task, index }) => {
  const totalProgress = task.total_quantity > 0 ? (task.total_produced / task.total_quantity) * 100 : 0;
  const processProgress = task.total_quantity > 0 ? (task.process_produced / task.total_quantity) * 100 : 0;
  const isDelayed = isPast(new Date(task.end_time)) && task.status !== 'completed';

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress': return <Badge variant="success">En Progreso</Badge>;
      case 'completed': return <Badge>Completado</Badge>;
      case 'blocked': return <Badge variant="destructive">Bloqueado</Badge>;
      default: return <Badge variant="outline">Pendiente</Badge>;
    }
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`p-3 mb-3 rounded-lg card-shadow border-l-4 ${
            snapshot.isDragging ? 'shadow-xl scale-105' : ''
          } ${isDelayed ? 'border-red-500' : 'border-blue-500'}`}
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          <div className="flex justify-between items-start">
            <p className="text-sm font-bold pr-2" style={{ color: 'var(--text-primary)' }}>
              {task.op_code}
            </p>
            {isDelayed && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground mb-2">{task.product_name}</p>
          
          <div className="space-y-2 text-xs mb-3">
            <div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Avance Proceso</span>
                <span className="font-mono">{task.process_produced}/{task.total_quantity}</span>
              </div>
              <Progress value={processProgress} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Avance Total OP</span>
                <span className="font-mono">{task.total_produced}/{task.total_quantity}</span>
              </div>
              <Progress value={totalProgress} className="h-2 bg-green-400/20" indicatorClassName="bg-green-500" />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3"/>
              <span>{format(new Date(task.end_time), 'dd/MM/yy')}</span>
            </div>
            {getStatusBadge(task.status)}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanTask;