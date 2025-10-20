import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';

const CostCenterForm = ({ center, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Mano de obra',
    manager: '',
    status: 'Activo',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingTypes, setExistingTypes] = useState([]);

  const defaultTypes = useMemo(() => [
    { value: 'Mano de obra', label: 'Mano de obra' },
    { value: 'Materiales', label: 'Materiales' },
    { value: 'Servicios', label: 'Servicios' },
    { value: 'Indirectos', label: 'Indirectos' },
    { value: 'Otros', label: 'Otros' },
  ], []);

  useEffect(() => {
    const fetchTypes = async () => {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('type');
      
      if (!error && data) {
        const uniqueTypes = [...new Set(data.map(item => item.type).filter(Boolean))];
        const combined = [...defaultTypes.map(t => t.value), ...uniqueTypes];
        const finalTypes = [...new Set(combined)].map(t => ({ value: t, label: t }));
        setExistingTypes(finalTypes);
      } else {
        setExistingTypes(defaultTypes);
      }
    };
    fetchTypes();
  }, [defaultTypes]);

  useEffect(() => {
    if (center) {
      setFormData({
        name: center.name || '',
        type: center.type || 'Mano de obra',
        manager: center.manager || '',
        status: center.status || 'Activo',
      });
    } else {
      setFormData({
        name: '',
        type: 'Mano de obra',
        manager: '',
        status: 'Activo',
      });
    }
  }, [center]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = { ...formData };

      let query;
      if (center) {
        query = supabase.from('cost_centers').update(payload).eq('id', center.id);
      } else {
        query = supabase.from('cost_centers').insert(payload);
      }

      const { error } = await query;
      if (error) throw error;

      toast({ title: '✅ Éxito', description: `Centro de costo ${center ? 'actualizado' : 'creado'} con éxito.` });
      onSuccess();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Centro de Costo</Label>
        <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ej: Confección" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Combobox
            items={existingTypes}
            value={formData.type}
            onChange={(value) => handleSelectChange('type', value)}
            placeholder="Selecciona o crea un tipo..."
            searchPlaceholder="Buscar tipo..."
            noResultsText="No se encontró el tipo."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select name="status" onValueChange={(v) => handleSelectChange('status', v)} value={formData.status}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="manager">Responsable (Opcional)</Label>
        <Input id="manager" name="manager" value={formData.manager} onChange={handleInputChange} placeholder="Nombre del responsable" />
      </div>
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
};

export default CostCenterForm;