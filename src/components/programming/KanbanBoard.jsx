import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Filter, Loader2 } from 'lucide-react';
import KanbanColumn from '@/components/programming/KanbanColumn';

const KanbanBoard = () => {
  const [boardData, setBoardData] = useState({ tasks: {}, columns: {}, columnOrder: [] });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const [filters, setFilters] = useState({ opId: '', productId: '' });
  const [filterOptions, setFilterOptions] = useState({ ops: [], products: [] });

  const fetchFilterOptions = useCallback(async () => {
      const { data: ops, error: opError } = await supabase.from('production_orders').select('id, code').order('code');
      const { data: products, error: pError } = await supabase.from('products').select('id, name').order('name');
      if (opError || pError) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los filtros.' });
      } else {
          setFilterOptions({ 
            ops: ops.map(o => ({ value: o.id, label: o.code })), 
            products: products.map(p => ({ value: p.id, label: p.name })) 
          });
      }
  }, [toast]);
  
  const fetchKanbanData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_kanban_board_data', {
        p_op_id: filters.opId || null,
        p_product_id: filters.productId || null
      });
      
      if (error) throw error;

      if (data) {
        setBoardData({
          tasks: data.tasks || {},
          columns: data.columns || {},
          columnOrder: data.columnOrder || [],
        });
      } else {
        setBoardData({ tasks: {}, columns: {}, columnOrder: [] });
      }

    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al cargar datos del Kanban', description: error.message });
    } finally {
      setLoading(false);
    }
  }, [toast, filters]);
  
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchKanbanData();
  }, [fetchKanbanData]);

  useEffect(() => {
    const channel = supabase
      .channel('kanban-board-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kanban_tasks' }, fetchKanbanData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, fetchKanbanData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchKanbanData]);

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    const startCol = boardData.columns[source.droppableId];
    const finishCol = boardData.columns[destination.droppableId];

    // Optimistic UI Update
    const startTaskIds = Array.from(startCol.taskIds);
    startTaskIds.splice(source.index, 1);
    const newStartCol = { ...startCol, taskIds: startTaskIds };

    let newFinishCol;
    if (startCol.id === finishCol.id) {
        const newFinishTaskIds = Array.from(startCol.taskIds);
        newFinishTaskIds.splice(source.index, 1);
        newFinishTaskIds.splice(destination.index, 0, draggableId);
        newFinishCol = { ...finishCol, taskIds: newFinishTaskIds };
    } else {
        const finishTaskIds = Array.from(finishCol.taskIds);
        finishTaskIds.splice(destination.index, 0, draggableId);
        newFinishCol = { ...finishCol, taskIds: finishTaskIds };
    }
    
    const newBoardData = {
      ...boardData,
      columns: {
        ...boardData.columns,
        [newStartCol.id]: newStartCol,
        [newFinishCol.id]: newFinishCol,
      },
    };
    setBoardData(newBoardData);

    // Persist changes to Supabase
    try {
      const updates = newFinishCol.taskIds.map((taskId, index) => ({
        id: taskId,
        process_id: finishCol.id,
        sequence_order: index,
        status: 'in_progress',
      }));

      const { error } = await supabase.from('kanban_tasks').upsert(updates, { onConflict: 'id' });

      if (error) throw error;
      toast({ title: "Tablero actualizado", description: "El cambio se ha guardado correctamente." });
      fetchKanbanData();
    } catch (error) {
      toast({ variant: 'destructive', title: "Error al actualizar", description: `No se pudo guardar el cambio: ${error.message}` });
      fetchKanbanData(); // Revert UI
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)]">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4 p-1">
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-5 h-5 text-muted-foreground"/>
                <Combobox
                    items={filterOptions.ops}
                    value={filters.opId}
                    onValueChange={value => setFilters(f => ({ ...f, opId: value }))}
                    placeholder="Filtrar por OP..."
                    searchPlaceholder="Buscar OP..."
                    noResultsText="No se encontró la OP."
                />
                 <Combobox
                    items={filterOptions.products}
                    value={filters.productId}
                    onValueChange={value => setFilters(f => ({ ...f, productId: value }))}
                    placeholder="Filtrar por producto..."
                    searchPlaceholder="Buscar producto..."
                    noResultsText="No se encontró el producto."
                />
            </div>
        </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 flex-grow overflow-auto p-1">
            {boardData.columnOrder && boardData.columnOrder.map(columnId => {
              const column = boardData.columns[columnId];
              if(!column) return null;
              const tasks = column.taskIds.map(taskId => boardData.tasks[taskId]).filter(Boolean);

              return (
                <KanbanColumn key={column.id} column={column} tasks={tasks} />
              );
            })}
          </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default KanbanBoard;