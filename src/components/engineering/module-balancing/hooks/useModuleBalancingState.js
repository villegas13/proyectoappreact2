import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export const useModuleBalancingState = (balanceData, numberOfPeople) => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const [operationSheet, setOperationSheet] = useState(null);
  const [dndState, setDndState] = useState({ unassigned: [], operators: {} });
  const [operatorNames, setOperatorNames] = useState({});
  const [assignmentTarget, setAssignmentTarget] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: productsData } = await supabase.from('products').select('id, name, reference');
      setProducts(productsData || []);
      const { data: processesData } = await supabase.from('processes').select('id, name').order('sequence_order');
      setProcesses(processesData || []);
    };
    fetchInitialData();
  }, []);

  const initializeStateForProduct = useCallback((sheetData, peopleCount, isEditing = false) => {
    const ops = sheetData.operation_sheet_items.map(item => {
      const standard = Array.isArray(item.operations.operation_standards) ? item.operations.operation_standards[0] : item.operations.operation_standards;
      const sam = parseFloat(standard?.standard_time) || 0;
      const total_uph = sam > 0 ? Math.round(60 / sam) : 0;

      return {
        ...item.operations,
        sam: sam,
        total_uph: total_uph,
        assigned_uph: 0,
        pending_uph: total_uph,
      };
    });

    if (isEditing && balanceData) {
      supabase
        .from('module_balancing_operators')
        .select('*, module_balancing_assignments(*, operations(*, process_id, processes(name), operation_standards!left(standard_time)))')
        .eq('module_balancing_id', balanceData.id)
        .then(({ data: operatorsData }) => {
          const operatorsMap = {};
          const operatorNamesMap = {};
          const opsWithAssignments = [...ops];

          operatorsData.sort((a, b) => a.operator_number - b.operator_number).forEach(op => {
            const assignedOps = op.module_balancing_assignments.map(a => {
              const standard = Array.isArray(a.operations.operation_standards) ? a.operations.operation_standards[0] : a.operations.operation_standards;
              const sam = parseFloat(standard?.standard_time) || 0;
              const baseOp = opsWithAssignments.find(o => o.id === a.operation_id);
              if (baseOp) {
                baseOp.assigned_uph += a.assigned_units_per_hour;
                baseOp.pending_uph = baseOp.total_uph - baseOp.assigned_uph;
              }
              return {
                ...a.operations,
                instance_id: uuidv4(),
                sam: sam,
                assigned_units_per_hour: a.assigned_units_per_hour
              };
            });
            operatorsMap[op.id] = assignedOps;
            operatorNamesMap[op.id] = op.operator_name;
          });

          setOperatorNames(operatorNamesMap);
          setDndState({ unassigned: opsWithAssignments, operators: operatorsMap });
        });
    } else {
      const initialOperators = {};
      const initialOpNames = {};
      for (let i = 0; i < peopleCount; i++) {
        const newId = `operator_${i}`;
        initialOperators[newId] = [];
        initialOpNames[newId] = `Operario ${i + 1}`;
      }
      setDndState({ unassigned: ops, operators: initialOperators });
      setOperatorNames(initialOpNames);
    }
  }, [balanceData]);

  const handleProductChange = useCallback(async (productId, isEditing = false) => {
    setSelectedProductId(productId);
    setSelectedProcessId('');

    if (!productId) {
      setOperationSheet(null);
      setDndState({ unassigned: [], operators: {} });
      return;
    }

    const { data: sheetData, error } = await supabase
      .from('operation_sheets')
      .select('id, operation_sheet_items(*, operations(*, process_id, processes(name), operation_standards!left(standard_time)))')
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `Error al buscar la hoja de operaciones: ${error.message}` });
      return;
    }
    if (!sheetData) {
      toast({ variant: 'destructive', title: 'Atención', description: 'No se encontró una Hoja de Operaciones para este producto.' });
      setOperationSheet(null);
      setDndState({ unassigned: [], operators: {} });
      return;
    }
    
    setOperationSheet(sheetData);
    const people = balanceData?.number_of_people || numberOfPeople;
    initializeStateForProduct(sheetData, people, isEditing);
  }, [balanceData, numberOfPeople, toast, initializeStateForProduct]);

  useEffect(() => {
    if (balanceData) {
      setSelectedProductId(balanceData.product_id);
      handleProductChange(balanceData.product_id, true);
    }
  }, [balanceData, handleProductChange]);

  useEffect(() => {
    if (operationSheet) {
      initializeStateForProduct(operationSheet, numberOfPeople, !!balanceData);
    }
  }, [numberOfPeople, operationSheet, balanceData, initializeStateForProduct]);

  const assignOperationToOperator = (operation, operatorId, units) => {
    if (!operation || !operatorId || units <= 0) return;
    
    setDndState(prev => {
        const newDndState = JSON.parse(JSON.stringify(prev));
        const { unassigned, operators } = newDndState;

        const originalOperation = unassigned.find(op => op.id === operation.id);
        if (!originalOperation) return prev;
        
        const unitsToAssign = Math.min(units, originalOperation.pending_uph);
        if (unitsToAssign <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No hay unidades pendientes para asignar.' });
            return prev;
        }
        
        originalOperation.assigned_uph += unitsToAssign;
        originalOperation.pending_uph -= unitsToAssign;

        const newOpInstance = {
            ...originalOperation,
            instance_id: uuidv4(),
            assigned_units_per_hour: unitsToAssign,
        };
        
        if (operators[operatorId]) {
            operators[operatorId].push(newOpInstance);
        }
        
        return { unassigned, operators };
    });
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || destination.droppableId === 'unassigned') return;

    const operation = dndState.unassigned.find(op => op.id === draggableId);
    if (!operation) return;

    setAssignmentTarget({ operation, operatorId: destination.droppableId });
  };
  
  const removeOperation = (operatorId, operationInstanceId) => {
    setDndState(prev => {
        const newDndState = JSON.parse(JSON.stringify(prev));
        const { unassigned, operators } = newDndState;

        const opIndex = operators[operatorId].findIndex(op => op.instance_id === operationInstanceId);
        if (opIndex === -1) return prev;
        
        const [removedOp] = operators[operatorId].splice(opIndex, 1);
        
        const originalOperation = unassigned.find(op => op.id === removedOp.id);
        if (originalOperation) {
            originalOperation.assigned_uph -= removedOp.assigned_units_per_hour;
            originalOperation.pending_uph += removedOp.assigned_units_per_hour;
        }
        
        return { unassigned, operators };
    });
  };
  
  const handleAssignedUnitsChange = (operatorId, operationInstanceId, value) => {
    setDndState(prev => {
        const newDndState = JSON.parse(JSON.stringify(prev));
        const { unassigned, operators } = newDndState;

        const operation = operators[operatorId]?.find(op => op.instance_id === operationInstanceId);
        if (!operation) return prev;

        const originalOperation = unassigned.find(op => op.id === operation.id);
        if (!originalOperation) return prev;
        
        const oldValue = operation.assigned_units_per_hour;
        const diff = value - oldValue;
        
        if(originalOperation.pending_uph - diff < 0) {
            toast({variant: 'destructive', title: 'Límite excedido', description: `Solo puedes asignar ${originalOperation.pending_uph + oldValue} unidades más.`});
            return prev;
        }
        
        originalOperation.assigned_uph += diff;
        originalOperation.pending_uph -= diff;
        operation.assigned_units_per_hour = value;
        
        return { unassigned, operators };
    });
  };
  
  const unassignedOperationsFiltered = useMemo(() => selectedProcessId
    ? dndState.unassigned.filter(op => op.process_id === selectedProcessId)
    : dndState.unassigned, [dndState.unassigned, selectedProcessId]);

  return {
    products,
    processes,
    selectedProductId,
    setSelectedProductId,
    selectedProcessId,
    setSelectedProcessId,
    operationSheet,
    dndState: { ...dndState, unassigned: unassignedOperationsFiltered },
    operatorNames,
    setOperatorNames,
    handleProductChange,
    onDragEnd,
    handleAssignedUnitsChange,
    assignOperationToOperator,
    assignmentTarget,
    setAssignmentTarget,
    removeOperation,
  };
};