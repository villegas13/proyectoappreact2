import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft } from 'lucide-react';

const MovementForm = ({ onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [movementType, setMovementType] = useState('');
  const [formData, setFormData] = useState({
    item_id: '',
    quantity: '',
    cost_per_unit: '',
    warehouse_id: '',
    location_id: '',
    to_warehouse_id: '',
    to_location_id: '',
    document_ref: '',
  });

  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [toLocations, setToLocations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: itemsData } = await supabase.from('inventory_items').select('id, name, reference, last_cost');
      const { data: warehousesData } = await supabase.from('warehouses').select('id, name');
      setItems(itemsData || []);
      setWarehouses(warehousesData || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchLocations = async (warehouseId, setLocs) => {
      if (!warehouseId) {
        setLocs([]);
        return;
      }
      const { data } = await supabase.from('locations').select('*').eq('warehouse_id', warehouseId);
      setLocs(data || []);
    };
    fetchLocations(formData.warehouse_id, setLocations);
    if (movementType === 'transferencia') {
        fetchLocations(formData.to_warehouse_id, setToLocations);
    }
  }, [formData.warehouse_id, formData.to_warehouse_id, movementType]);
  
  useEffect(() => {
    if (formData.item_id) {
      const selectedItem = items.find(i => i.id === formData.item_id);
      if (selectedItem) {
        setFormData(prev => ({...prev, cost_per_unit: selectedItem.last_cost || 0}));
      }
    }
  }, [formData.item_id, items]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
    if(id === 'warehouse_id') setFormData(prev => ({ ...prev, location_id: '' }));
    if(id === 'to_warehouse_id') setFormData(prev => ({ ...prev, to_location_id: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const quantity = parseFloat(formData.quantity);
    const cost_per_unit = parseFloat(formData.cost_per_unit);

    if (!formData.item_id || !formData.warehouse_id || !movementType || !formData.location_id) {
        toast({ variant: "destructive", title: "Error", description: "Por favor complete todos los campos requeridos, incluyendo la ubicación." });
        setIsSubmitting(false);
        return;
    }

    if (movementType === 'transferencia') {
      if (!formData.to_warehouse_id || !formData.to_location_id) {
        toast({ variant: "destructive", title: "Error", description: "Por favor complete todos los campos de transferencia, incluyendo la ubicación de destino." });
        setIsSubmitting(false);
        return;
      }
      const { error: transferError } = await supabase.rpc('handle_inventory_transfer', {
          p_item_id: formData.item_id,
          p_quantity: quantity,
          p_cost_per_unit: cost_per_unit,
          p_from_location_id: formData.location_id,
          p_to_location_id: formData.to_location_id,
          p_document_ref: formData.document_ref,
          p_user_id: user.id
      });

      if (transferError) {
        toast({ variant: 'destructive', title: 'Error', description: `Error en la transferencia: ${transferError.message}` });
      } else {
        toast({ title: 'Éxito', description: 'Transferencia registrada correctamente.' });
        onSuccess();
      }

    } else {
        const payload = {
            item_id: formData.item_id,
            movement_type: movementType,
            quantity: quantity,
            cost_per_unit: cost_per_unit,
            total_cost: quantity * cost_per_unit,
            warehouse_id: formData.warehouse_id,
            location_id: formData.location_id,
            document_ref: formData.document_ref,
            user_id: user.id
        };
        const { error } = await supabase.from('inventory_movements').insert([payload]);
        if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } else {
            toast({ title: "Éxito", description: 'Movimiento registrado correctamente.' });
            onSuccess();
        }
    }
    setIsSubmitting(false);
  };
  
  const movementTypes = [
    { value: 'entrada_compra', label: 'Entrada por Compra' },
    { value: 'entrada_produccion', label: 'Entrada por Producción' },
    { value: 'entrada_devolucion', label: 'Entrada por Devolución' },
    { value: 'entrada_ajuste', label: 'Ajuste de Entrada (+)' },
    { value: 'salida_consumo', label: 'Salida por Consumo (OP)' },
    { value: 'salida_devolucion_proveedor', label: 'Devolución a Proveedor' },
    { value: 'salida_ajuste', label: 'Ajuste de Salida (-)' },
    { value: 'transferencia', label: 'Transferencia entre Ubicaciones' },
  ];

  const isTransfer = movementType === 'transferencia';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <Label htmlFor="movementType">Tipo de Movimiento</Label>
        <Select onValueChange={setMovementType} value={movementType}>
          <SelectTrigger><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
          <SelectContent>
            {movementTypes.map(mt => <SelectItem key={mt.value} value={mt.value}>{mt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {movementType && <>
        <div className="md:col-span-2">
            <Label htmlFor="item_id">Ítem</Label>
            <Select onValueChange={(v) => handleSelectChange('item_id', v)} value={formData.item_id}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ítem..." /></SelectTrigger>
                <SelectContent>
                    {items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.reference})</SelectItem>)}
                </SelectContent>
            </Select>
        </div>

        <div>
            <Label htmlFor="quantity">Cantidad</Label>
            <Input id="quantity" type="number" value={formData.quantity} onChange={handleInputChange} required />
        </div>
        <div>
            <Label htmlFor="cost_per_unit">Costo Unitario</Label>
            <Input id="cost_per_unit" type="number" step="0.01" value={formData.cost_per_unit} onChange={handleInputChange} required />
        </div>

        <div>
            <Label htmlFor="warehouse_id">{isTransfer ? 'Bodega Origen' : 'Bodega'}</Label>
            <Select onValueChange={(v) => handleSelectChange('warehouse_id', v)} value={formData.warehouse_id}>
                <SelectTrigger><SelectValue placeholder="Seleccionar bodega..." /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
            </Select>
        </div>
        <div>
            <Label htmlFor="location_id">{isTransfer ? 'Ubicación Origen' : 'Ubicación'}</Label>
            <Select onValueChange={(v) => handleSelectChange('location_id', v)} value={formData.location_id} disabled={!formData.warehouse_id}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ubicación..." /></SelectTrigger>
                <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.area} / {l.specific_location_code}</SelectItem>)}</SelectContent>
            </Select>
        </div>

        {isTransfer && <>
            <div>
                <Label htmlFor="to_warehouse_id">Bodega Destino</Label>
                <Select onValueChange={(v) => handleSelectChange('to_warehouse_id', v)} value={formData.to_warehouse_id}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar bodega..." /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div>
                <Label htmlFor="to_location_id">Ubicación Destino</Label>
                <Select onValueChange={(v) => handleSelectChange('to_location_id', v)} value={formData.to_location_id} disabled={!formData.to_warehouse_id}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar ubicación..." /></SelectTrigger>
                    <SelectContent>{toLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.area} / {l.specific_location_code}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </>}
        
        <div className="md:col-span-2">
            <Label htmlFor="document_ref">Documento de Referencia</Label>
            <Input id="document_ref" value={formData.document_ref} onChange={handleInputChange} placeholder="Ej: Factura FC-123, Orden de Compra OC-456"/>
        </div>

        <div className="md:col-span-2 flex justify-end items-center gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onSuccess}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white">
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Registrando...' : 'Registrar Movimiento'}
            </Button>
        </div>
      </>}
    </form>
  );
};

export default MovementForm;