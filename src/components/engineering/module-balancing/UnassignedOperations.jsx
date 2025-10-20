import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Briefcase, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const UnassignedOperations = ({ operations, operators, operatorNames, onQuickAssign }) => {
  return (
    <Droppable droppableId="unassigned">
      {(provided) => (
        <div ref={provided.innerRef} {...provided.droppableProps} className="p-4 rounded-xl card-shadow overflow-y-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h4 className="font-semibold flex items-center mb-4"><Briefcase className="w-4 h-4 mr-2" />Operaciones por Asignar</h4>
          <div className="space-y-3">
            {operations?.map((op, index) => (
              <Draggable key={op.id} draggableId={op.id} index={index}>
                {(providedDraggable, snapshot) => (
                  <div 
                    ref={providedDraggable.innerRef} 
                    {...providedDraggable.draggableProps} 
                    {...providedDraggable.dragHandleProps} 
                    className={`p-3 rounded-lg text-sm cursor-grab flex justify-between items-center ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                    style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <div>
                      <p className="font-medium">{op.name}</p>
                      <p className="text-xs text-muted-foreground">
                        U/H ({60}/{op.sam.toFixed(2)}): {op.total_uph} | Pendiente: <span className="font-bold text-accent">{op.pending_uph}</span>
                      </p>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={op.pending_uph <= 0}>
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2">
                            <div className="text-sm font-semibold p-2">Asignar a...</div>
                            <div className="flex flex-col gap-1">
                                {Object.keys(operators).map(opId => (
                                    <Button 
                                        key={opId} 
                                        variant="ghost" 
                                        className="w-full justify-start"
                                        onClick={() => onQuickAssign({ operation: op, operatorId: opId })}
                                    >
                                        {operatorNames[opId]}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
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

export default UnassignedOperations;