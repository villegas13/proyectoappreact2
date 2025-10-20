import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

export const LocationForm = ({ location, warehouseId, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ area: '', specific_location_code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (location) {
      setFormData({ area: location.area || '', specific_location_code: location.specific_location_code || '' });
    } else {
      setFormData({ area: '', specific_location_code: '' });
    }
  }, [location]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!warehouseId) {
      toast({ variant: "destructive", title: "Error", description: "No se ha seleccionado una bodega." });
      return;
    }
    setIsSubmitting(true);

    const payload = { ...formData, warehouse_id: warehouseId };

    let error;
    if (location) {
      const { error: updateError } = await supabase.from('locations').update(payload).eq('id', location.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('locations').insert([payload]);
      error = insertError;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Éxito", description: `Ubicación ${location ? 'actualizada' : 'creada'} correctamente.` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="area">Área</Label>
        <Input id="area" value={formData.area} onChange={handleInputChange} placeholder="Ej: Materia Prima, Producto Terminado" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="specific_location_code">Código de Ubicación Específica</Label>
        <Input id="specific_location_code" value={formData.specific_location_code} onChange={handleInputChange} placeholder="Ej: Estantería A1, Rack B2" required />
      </div>
      <div className="flex justify-end items-center gap-4 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-green-500 hover:bg-green-600 text-white">
          <MapPin className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar Ubicación'}
        </Button>
      </div>
    </form>
  );
};