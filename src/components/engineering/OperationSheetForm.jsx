import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Save, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const OperationSheetForm = ({ sheetData, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [availableOperations, setAvailableOperations] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedOperations, setSelectedOperations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: productsData, error: productsError } = await supabase.from('products').select('id, name, reference');
      if (productsError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los productos.' });
      else setProducts(productsData);

      const { data: opsData, error: opsError } = await supabase.from('operations').select('*, processes(name), operation_standards!left(*)');
      if (opsError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las operaciones.' });
      else {
        const formattedOps = opsData.map(op => ({
          ...op,
          operation_standards: Array.isArray(op.operation_standards) ? op.operation_standards : (op.operation_standards ? [op.operation_standards] : [])
        }));
        setAvailableOperations(formattedOps);
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    const loadSheetData = async () => {
      if (sheetData) {
        setSelectedProductId(sheetData.product_id || sheetData.products.id);
        const { data: items, error } = await supabase
          .from('operation_sheet_items')
          .select('*, operations(*, processes(name), operation_standards!left(*))')
          .eq('operation_sheet_id', sheetData.id)
          .order('sequence_order', { ascending: true });
        
        if (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las operaciones de la hoja.' });
        } else {
          const formattedOps = items.map(item => ({
            ...item.operations,
            operation_standards: Array.isArray(item.operations.operation_standards) ? item.operations.operation_standards : (item.operations.operation_standards ? [item.operations.operation_standards] : [])
          }));
          setSelectedOperations(formattedOps);
        }
      }
    };
    loadSheetData();
  }, [sheetData, toast]);

  const handleAddOperation = (operationId) => {
    const operationToAdd = availableOperations.find(op => op.id === operationId);
    if (operationToAdd && !selectedOperations.some(op => op.id === operationId)) {
      setSelectedOperations([...selectedOperations, operationToAdd]);
    }
  };

  const handleRemoveOperation = (operationId) => {
    setSelectedOperations(selectedOperations.filter(op => op.id !== operationId));
  };

  const { totalSAM, totalUPH, samByProcess } = useMemo(() => {
    const total = selectedOperations.reduce((acc, op) => {
      const sam = parseFloat(op.operation_standards?.[0]?.standard_time) || 0;
      return acc + sam;
    }, 0);

    const uph = total > 0 ? 60 / total : 0;

    const byProcess = selectedOperations.reduce((acc, op) => {
      const processName = op.processes?.name || 'Sin Proceso';
      const sam = parseFloat(op.operation_standards?.[0]?.standard_time) || 0;
      acc[processName] = (acc[processName] || 0) + sam;
      return acc;
    }, {});

    return { totalSAM: total, totalUPH: uph, samByProcess: byProcess };
  }, [selectedOperations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductId || selectedOperations.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un producto y al menos una operación.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const { data: savedSheet, error: sheetError } = await supabase
        .from('operation_sheets')
        .upsert({
          id: sheetData?.id,
          product_id: selectedProductId,
          total_sam: totalSAM,
          total_units_per_hour: totalUPH,
        })
        .select()
        .single();

      if (sheetError) throw sheetError;

      const sheetId = savedSheet.id;

      // Delete old items if editing
      if (sheetData?.id) {
        await supabase.from('operation_sheet_items').delete().eq('operation_sheet_id', sheetId);
      }

      const itemsToSave = selectedOperations.map((op, index) => ({
        operation_sheet_id: sheetId,
        operation_id: op.id,
        sequence_order: index + 1,
      }));

      const { error: itemsError } = await supabase.from('operation_sheet_items').insert(itemsToSave);
      if (itemsError) throw itemsError;

      toast({ title: 'Éxito', description: `Hoja de operaciones ${sheetData ? 'actualizada' : 'creada'} correctamente.` });
      onSuccess();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="product-select">Producto</Label>
          <Select onValueChange={setSelectedProductId} value={selectedProductId || ''} disabled={!!sheetData}>
            <SelectTrigger id="product-select">
              <SelectValue placeholder="Selecciona una referencia de producto..." />
            </SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.reference} - {p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="operation-select">Añadir Operación</Label>
          <Select onValueChange={handleAddOperation}>
            <SelectTrigger id="operation-select">
              <SelectValue placeholder="Busca y añade una operación..." />
            </SelectTrigger>
            <SelectContent>
              {availableOperations.map(op => (
                <SelectItem key={op.id} value={op.id} disabled={selectedOperations.some(sOp => sOp.id === op.id)}>
                  {op.code} - {op.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border max-h-96 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Proceso</TableHead>
              <TableHead>SAM (min)</TableHead>
              <TableHead>Unidades/Hora</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedOperations.length > 0 ? selectedOperations.map(op => {
              const sam = parseFloat(op.operation_standards?.[0]?.standard_time) || 0;
              const uph = sam > 0 ? 60 / sam : 0;
              return (
                <TableRow key={op.id}>
                  <TableCell>{op.code}</TableCell>
                  <TableCell>{op.name}</TableCell>
                  <TableCell>{op.processes?.name || 'N/A'}</TableCell>
                  <TableCell>{sam.toFixed(4)}</TableCell>
                  <TableCell>{Math.round(uph)}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOperation(op.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan="6" className="text-center h-24">Añade operaciones a la hoja.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 rounded-lg space-y-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <h4 className="font-semibold text-lg">Totales</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-md" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-sm text-muted-foreground">SAM Total</p>
            <p className="text-2xl font-bold">{totalSAM.toFixed(4)} min</p>
          </div>
          <div className="p-3 rounded-md" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-sm text-muted-foreground">Unidades por Hora Totales</p>
            <p className="text-2xl font-bold">{Math.round(totalUPH)}</p>
          </div>
          <div className="p-3 rounded-md md:col-span-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-sm text-muted-foreground mb-2">SAM por Proceso (min)</p>
            <div className="space-y-1 text-sm">
              {Object.entries(samByProcess).map(([process, sam]) => (
                <div key={process} className="flex justify-between">
                  <span>{process}</span>
                  <span className="font-medium">{sam.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
          <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Guardando...' : (sheetData ? 'Actualizar Hoja' : 'Guardar Hoja')}
        </Button>
      </div>
    </form>
  );
};