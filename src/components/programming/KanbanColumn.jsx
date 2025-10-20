import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import KanbanTask from '@/components/programming/KanbanTask';
import { ScrollArea } from '@/components/ui/scroll-area';

const KanbanColumn = ({ column, tasks }) => {
  return (
    <div 
      className="flex flex-col rounded-xl h-full"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="p-3 border-b sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border)' }}>
        <h3 className="font-semibold text-md capitalize text-center" style={{ color: 'var(--text-primary)' }}>
          {column.title}
          <span className="ml-2 text-xs font-normal bg-primary/10 text-primary px-2 py-1 rounded-full">{tasks.length}</span>
        </h3>
      </div>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <ScrollArea className="flex-grow">
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`p-3 flex-grow min-h-[200px] transition-colors duration-200 rounded-b-xl ${
                snapshot.isDraggingOver ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              {tasks.map((task, index) => (
                <KanbanTask key={task.id} task={task} index={index} />
              ))}
              {provided.placeholder}
              {tasks.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex items-center justify-center h-full">
                  <div className="w-full h-full border-2 border-dashed rounded-lg flex items-center justify-center p-2">
                    <p className="text-xs p-2 text-center" style={{ color: 'var(--text-muted)' }}>
                      Arrastra una tarea aquí
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;