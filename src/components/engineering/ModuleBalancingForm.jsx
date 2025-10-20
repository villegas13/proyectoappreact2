import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { DragDropContext } from 'react-beautiful-dnd';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { useModuleBalancingState } from './module-balancing/hooks/useModuleBalancingState';
import { useBalancingCalculations } from './module-balancing/hooks/useBalancingCalculations';
import BalancingHeader from './module-balancing/BalancingHeader';
import SummaryStats from './module-balancing/SummaryStats';
import UnassignedOperations from './module-balancing/UnassignedOperations';
import OperatorsGrid from './module-balancing/OperatorsGrid';
import AssignUnitsModal from './module-balancing/AssignUnitsModal';

const ModuleBalancingForm = ({ balanceData, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [numberOfPeople, setNumberOfPeople] = useState(balanceData?.number_of_people || 1);
  const [isModalOpen, setIsModalOpen] = useState(true);

  const {
    products,
    processes,
    selectedProductId,
    selectedProcessId,
    setSelectedProcessId,
    operationSheet,
    dndState,
    operatorNames,
    setOperatorNames,
    handleProductChange,
    onDragEnd,
    handleAssignedUnitsChange,
    assignOperationToOperator,
    assignmentTarget,
    setAssignmentTarget,
    removeOperation,
  } = useModuleBalancingState(balanceData, numberOfPeople);

  const { 
    operatorCalculations, 
    totalSAM, 
    unitsPerHour, 
    taktTime, 
    requiredMachines, 
    summaryStats 
  } = useBalancingCalculations(dndState, numberOfPeople, operationSheet, operatorNames);

  useEffect(() => {
    if (balanceData) {
      setNumberOfPeople(balanceData.number_of_people);
    }
  }, [balanceData]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (!selectedProductId || !operationSheet) throw new Error("Selecciona un producto con una hoja de operaciones válida.");
      
      const { data: savedBalance, error: balanceError } = await supabase
        .from('module_balancing')
        .upsert({
            id: balanceData?.id,
            product_id: selectedProductId,
            operation_sheet_id: operationSheet.id,
            number_of_people: numberOfPeople,
            total_sam: totalSAM,
            units_per_hour: unitsPerHour,
            takt_time: taktTime,
            required_machines: requiredMachines,
        })
        .select()
        .single();
      if(balanceError) throw balanceError;

      if (balanceData) {
        const { data: oldOps } = await supabase.from('module_balancing_operators').select('id').eq('module_balancing_id', balanceData.id);
        const oldOpIds = oldOps.map(o => o.id);
        if(oldOpIds.length > 0) {
            await supabase.from('module_balancing_assignments').delete().in('operator_id', oldOpIds);
            await supabase.from('module_balancing_operators').delete().in('id', oldOpIds);
        }
      }
      
      let operatorNumber = 1;
      for (const opId in dndState.operators) {
        const { occupiedMinutes, occupancyPercentage } = operatorCalculations[opId];
        const { data: savedOperator, error: opError } = await supabase
          .from('module_balancing_operators')
          .insert({
            module_balancing_id: savedBalance.id,
            operator_name: operatorNames[opId] || `Operario ${operatorNumber}`,
            operator_number: operatorNumber++,
            total_occupancy_minutes: occupiedMinutes,
            total_occupancy_percentage: occupancyPercentage,
          })
          .select()
          .single();
        if(opError) throw opError;
        
        const assignmentsToSave = dndState.operators[opId].map(op => ({
            operator_id: savedOperator.id,
            operation_id: op.id,
            assigned_units_per_hour: op.assigned_units_per_hour
        }));

        if(assignmentsToSave.length > 0) {
            const {error: assignError} = await supabase.from('module_balancing_assignments').insert(assignmentsToSave);
            if(assignError) throw assignError;
        }
      }

      toast({ title: 'Éxito', description: 'Balanceo guardado correctamente.' });
      onSuccess();
    } catch(error) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalClose = () => {
    closeModal();
    setIsModalOpen(false);
  }

  return (
     <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-full w-full h-full flex flex-col p-4">
            <DialogHeader>
                <DialogTitle>{balanceData ? 'Editar' : 'Crear'} Balanceo de Módulo</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col flex-grow h-[calc(100vh-10rem)]">
              <BalancingHeader
                products={products}
                selectedProductId={selectedProductId}
                handleProductChange={handleProductChange}
                numberOfPeople={numberOfPeople}
                setNumberOfPeople={setNumberOfPeople}
                balanceData={balanceData}
                processes={processes}
                selectedProcessId={selectedProcessId}
                setSelectedProcessId={setSelectedProcessId}
                operationSheet={operationSheet}
              />

              {operationSheet && (
                <SummaryStats
                  totalSAM={totalSAM}
                  unitsPerHour={unitsPerHour}
                  taktTime={taktTime}
                  requiredMachines={requiredMachines}
                  summaryStats={summaryStats}
                />
              )}
              
              <div className="flex-grow overflow-hidden mt-4">
                <DragDropContext onDragEnd={onDragEnd}>
                    {operationSheet ? (
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                        <UnassignedOperations 
                            operations={dndState.unassigned} 
                            operators={dndState.operators}
                            operatorNames={operatorNames}
                            onQuickAssign={setAssignmentTarget}
                        />
                        <OperatorsGrid
                          operators={dndState.operators}
                          operatorNames={operatorNames}
                          operatorCalculations={operatorCalculations}
                          setOperatorNames={setOperatorNames}
                          handleAssignedUnitsChange={handleAssignedUnitsChange}
                          onRemoveOperation={removeOperation}
                        />
                      </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            <p>Selecciona un producto para comenzar el balanceo.</p>
                        </div>
                    )}
                </DragDropContext>
              </div>

              {assignmentTarget && (
                <AssignUnitsModal
                  target={assignmentTarget}
                  onClose={() => setAssignmentTarget(null)}
                  onAssign={assignOperationToOperator}
                />
              )}

              <div className="flex justify-end gap-2 pt-4 mt-auto">
                <Button type="button" variant="outline" onClick={handleModalClose}>Cancelar</Button>
                <Button type="button" onClick={handleSubmit} disabled={isSubmitting || !operationSheet} className="bg-green-600 hover:bg-green-700 text-white">
                  <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Guardando...' : 'Guardar Balanceo'}
                </Button>
              </div>
            </div>
        </DialogContent>
     </Dialog>
  );
};

export default ModuleBalancingForm;