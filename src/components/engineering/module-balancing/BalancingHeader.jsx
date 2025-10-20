import React, { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const BalancingHeader = ({
  products,
  selectedProductId,
  handleProductChange,
  numberOfPeople,
  setNumberOfPeople,
  balanceData,
  processes,
  selectedProcessId,
  setSelectedProcessId,
  operationSheet,
}) => {
  const availableProcesses = useMemo(() => {
    if (!operationSheet) return [];
    const processIds = new Set(operationSheet.operation_sheet_items.map(item => item.operations.process_id));
    return processes.filter(p => processIds.has(p.id));
  }, [operationSheet, processes]);

  const handleProcessFilterChange = (value) => {
    setSelectedProcessId(value === 'all-processes' ? '' : value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1 mb-4 items-end">
      <div className="space-y-1">
        <Label>Producto</Label>
        <Select onValueChange={(value) => handleProductChange(value, false)} value={selectedProductId || ''} disabled={!!balanceData}>
          <SelectTrigger><SelectValue placeholder="Selecciona un producto..." /></SelectTrigger>
          <SelectContent>
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.reference} - {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-1">
        <Label>Filtrar por Proceso</Label>
        <Select onValueChange={handleProcessFilterChange} value={selectedProcessId || 'all-processes'} disabled={!operationSheet}>
          <SelectTrigger>
            <SelectValue placeholder="Todos los procesos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-processes">Todos los procesos</SelectItem>
            {availableProcesses.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="people-input"># Personas</Label>
        <Input
          id="people-input"
          type="number"
          value={numberOfPeople}
          onChange={e => setNumberOfPeople(Math.max(1, parseInt(e.target.value) || 1))}
          placeholder="Número de personas"
        />
      </div>
    </div>
  );
};

export default BalancingHeader;