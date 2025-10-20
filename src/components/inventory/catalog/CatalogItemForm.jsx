import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CatalogItemForm = ({ item, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    reference: '',
    name: '',
    item_type: 'materia_prima',
    unit_of_measure: '',
    standard_cost: '',
    main_supplier_id: null,
    alternate_supplier_id: null,
    min_stock: '',
    max_stock: '',
    cost_center_id: null,
  });
  const [suppliers, setSuppliers] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const itemTypes = [
    { value: 'materia_prima', label: 'Materia Prima' },
    { value: 'insumo', label: 'Insumo' },
    { value: 'producto_en_proceso', label: 'Producto en Proceso' },
    { value: 'producto_terminado', label: 'Producto Terminado' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const { data: suppliersData, error: suppliersError } = await supabase.from('suppliers').select('id, name');
      if (suppliersError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los proveedores.' });
      else setSuppliers(suppliersData);

      const { data: centersData, error: centersError } = await supabase.from('cost_centers').select('id, name').eq('status', 'Activo');
      if (centersError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los centros de costo.' });
      else setCostCenters(centersData);
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    if (item) {
      setFormData({
        reference: item.reference || '',
        name: item.name || '',
        item_type: item.item_type || 'materia_prima',
        unit_of_measure: item.unit_of_measure || '',
        standard_cost: item.standard_cost || '',
        main_supplier_id: item.main_supplier_id || null,
        alternate_supplier_id: item.alternate_supplier_id || null,
        min_stock: item.min_stock || '',
        max_stock: item.max_stock || '',
        cost_center_id: item.cost_center_id || null,
      });
    }
  }, [item]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value === 'null' ? null : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      ...formData,
      standard_cost: formData.standard_cost ? parseFloat(formData.standard_cost) : null,
      min_stock: formData.min_stock ? parseFloat(formData.min_stock) : null,
      max_stock: formData.max_stock ? parseFloat(formData.max_stock) : null,
    };

    try {
      const { error } = await supabase.from('inventory_items').upsert(item ? { id: item.id, ...payload } : payload);
      if (error) throw error;
      toast({ title: 'Éxito', description: `Ítem ${item ? 'actualizado' : 'creado'} correctamente.` });
      onSuccess();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="reference">Referencia</Label>
          <Input id="reference" name="reference" value={formData.reference} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre del Ítem</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="item_type">Tipo de Ítem</Label>
          <Select name="item_type" onValueChange={(v) => handleSelectChange('item_type', v)} value={formData.item_type}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {itemTypes.map(type => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit_of_measure">Unidad de Medida</Label>
          <Input id="unit_of_measure" name="unit_of_measure" value={formData.unit_of_measure} onChange={handleInputChange} placeholder="Ej: Metros, Unidades" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="standard_cost">Costo Estándar</Label>
          <Input id="standard_cost" name="standard_cost" type="number" value={formData.standard_cost} onChange={handleInputChange} placeholder="0.00" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cost_center_id">Centro de Costo (para materiales)</Label>
        <Select name="cost_center_id" onValueChange={(v) => handleSelectChange('cost_center_id', v)} value={formData.cost_center_id || ''}>
          <SelectTrigger><SelectValue placeholder="Asignar centro de costo..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="null">Ninguno</SelectItem>
            {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="main_supplier_id">Proveedor Principal</Label>
          <Select name="main_supplier_id" onValueChange={(v) => handleSelectChange('main_supplier_id', v)} value={formData.main_supplier_id || ''}>
            <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Ninguno</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="alternate_supplier_id">Proveedor Alterno</Label>
          <Select name="alternate_supplier_id" onValueChange={(v) => handleSelectChange('alternate_supplier_id', v)} value={formData.alternate_supplier_id || ''}>
            <SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Ninguno</SelectItem>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min_stock">Stock Mínimo</Label>
          <Input id="min_stock" name="min_stock" type="number" value={formData.min_stock} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_stock">Stock Máximo</Label>
          <Input id="max_stock" name="max_stock" type="number" value={formData.max_stock} onChange={handleInputChange} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar Ítem'}</Button>
      </div>
    </form>
  );
};

export default CatalogItemForm;