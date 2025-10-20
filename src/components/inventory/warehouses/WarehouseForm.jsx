import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Warehouse } from 'lucide-react';

export const WarehouseForm = ({ warehouse, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (warehouse) {
      setFormData({ name: warehouse.name, description: warehouse.description || '' });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [warehouse]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let error;
    if (warehouse) {
      const { error: updateError } = await supabase.from('warehouses').update(formData).eq('id', warehouse.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('warehouses').insert([formData]);
      error = insertError;
    }

    if (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } else {
      toast({ title: "Éxito", description: `Bodega ${warehouse ? 'actualizada' : 'creada'} correctamente.` });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la Bodega</Label>
        <Input id="name" value={formData.name} onChange={handleInputChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descripción (Opcional)</Label>
        <Textarea id="description" value={formData.description} onChange={handleInputChange} />
      </div>
      <div className="flex justify-end items-center gap-4 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-blue-500 hover:bg-blue-600 text-white">
          <Warehouse className="mr-2 h-4 w-4" />
          {isSubmitting ? 'Guardando...' : 'Guardar Bodega'}
        </Button>
      </div>
    </form>
  );
};