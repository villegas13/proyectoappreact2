import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

const KardexReport = () => {
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [kardexData, setKardexData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase.from('inventory_items').select('id, name, reference').order('name');
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los ítems.' });
      } else {
        setItems(data);
      }
    };
    fetchItems();
  }, [toast]);

  const fetchKardex = useCallback(async () => {
    if (!selectedItemId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, warehouse:warehouses(name), location:locations(specific_location_code, area)')
      .eq('item_id', selectedItemId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el Kardex.' });
      setKardexData([]);
    } else {
      let balance = 0;
      const processedData = data.map(mov => {
        const quantityChange = mov.movement_type.startsWith('entrada') ? mov.quantity : -mov.quantity;
        balance += quantityChange;
        return { ...mov, balance };
      });
      setKardexData(processedData);
    }
    setLoading(false);
  }, [selectedItemId, toast]);

  useEffect(() => {
    fetchKardex();
  }, [fetchKardex]);

  const movementTypeMap = {
    entrada_compra: 'Entrada Compra',
    entrada_devolucion: 'Entrada Devolución',
    entrada_ajuste: 'Ajuste (+)',
    entrada_produccion: 'Entrada Producción',
    salida_consumo: 'Salida Consumo',
    salida_devolucion_proveedor: 'Devolución Prov.',
    salida_ajuste: 'Ajuste (-)',
    transferencia_salida: 'Transf. (Salida)',
    transferencia_entrada: 'Transf. (Entrada)',
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      <h4 className="font-semibold">Consulta de Kardex por Producto</h4>
      <div className="max-w-sm">
        <Select onValueChange={setSelectedItemId} value={selectedItemId}>
          <SelectTrigger><SelectValue placeholder="Selecciona un ítem..." /></SelectTrigger>
          <SelectContent>
            {items.map(item => (
              <SelectItem key={item.id} value={item.id}>{item.name} ({item.reference})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Salida</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Ref.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="7" className="text-center">Cargando...</TableCell></TableRow>
            ) : kardexData.length > 0 ? (
              kardexData.map(mov => {
                const isEntry = mov.movement_type.startsWith('entrada');
                return (
                  <TableRow key={mov.id}>
                    <TableCell>{format(new Date(mov.created_at), 'dd/MM/yy HH:mm')}</TableCell>
                    <TableCell>{movementTypeMap[mov.movement_type] || mov.movement_type}</TableCell>
                    <TableCell>{mov.location ? `${mov.location.area}/${mov.location.specific_location_code}` : 'N/A'}</TableCell>
                    <TableCell className="text-right text-green-500">{isEntry ? mov.quantity : ''}</TableCell>
                    <TableCell className="text-right text-red-500">{!isEntry ? mov.quantity : ''}</TableCell>
                    <TableCell className="text-right font-bold">{mov.balance}</TableCell>
                    <TableCell>{mov.document_ref}</TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow><TableCell colSpan="7" className="text-center">{selectedItemId ? 'No hay movimientos para este ítem.' : 'Selecciona un ítem para ver su Kardex.'}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default KardexReport;