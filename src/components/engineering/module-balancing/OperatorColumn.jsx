import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OperatorColumn = ({ opId, name, operatorData, calculations, onNameChange, onUnitsChange, onRemoveOperation }) => {
  const { occupiedMinutes, occupancyPercentage } = calculations || { occupiedMinutes: 0, occupancyPercentage: 0 };
  const occupancyClass =
    occupancyPercentage > 100 ? 'bg-red-500/20 text-red-400' :
    occupancyPercentage >= 80 ? 'bg-green-500/10 text-green-400' :
    'bg-orange-500/10 text-orange-400';

  return (
    <Droppable droppableId={opId}>
      {(provided, snapshot) => (
        <div 
          ref={provided.innerRef} 
          {...provided.droppableProps}
          className="p-4 rounded-xl card-shadow flex flex-col h-fit"
        >
          <Input value={name || ''} onChange={(e) => onNameChange(opId, e.target.value)} className="font-semibold mb-2" />
          <div className={`p-2 rounded-lg text-xs mb-3 flex items-center justify-center ${occupancyClass}`}>
            {occupancyPercentage > 100 && <AlertTriangle className="inline w-4 h-4 mr-1" />}
            <Clock className="w-3 h-3 mr-1" /> Ocup: {occupancyPercentage.toFixed(1)}% ({occupiedMinutes.toFixed(2)} min)
          </div>
          <div className={`min-h-[100px] space-y-2 flex-grow transition-colors rounded-lg p-2 ${snapshot.isDraggingOver ? 'bg-blue-500/10' : ''}`}>
            {operatorData.map((op, index) => (
              <Draggable key={op.instance_id} draggableId={`${op.id}-${op.instance_id}`} index={index}>
                {(providedDraggable) => (
                  <div ref={providedDraggable.innerRef} {...providedDraggable.draggableProps} {...providedDraggable.dragHandleProps} className="p-2 rounded-lg text-sm bg-background border cursor-grab">
                    <div className="flex justify-between items-start">
                      <p className="font-medium flex-1 pr-2">{op.name}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveOperation(opId, op.instance_id)}>
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Label htmlFor={`uph-${op.instance_id}`} className="text-xs">U/H Asignadas:</Label>
                      <Input
                        id={`uph-${op.instance_id}`}
                        type="number"
                        value={op.assigned_units_per_hour || ''}
                        onChange={(e) => onUnitsChange(opId, op.instance_id, parseInt(e.target.value) || 0)}
                        className="h-7 w-20"
                      />
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
};

export default OperatorColumn;