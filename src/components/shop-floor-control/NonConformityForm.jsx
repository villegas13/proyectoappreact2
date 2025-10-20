import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const DEFECT_CATEGORIES = [
  'Avería de costura',
  'Error de corte',
  'Defecto de material',
  'Fallo en bordado',
  'Otro'
];

const NonConformityForm = ({ timerId, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [processes, setProcesses] = useState([]);
  const [formData, setFormData] = useState({
    quantity: '',
    category: '',
    category_other_description: '',
    responsible_process_id: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProcesses = async () => {
      const { data, error } = await supabase.from('processes').select('id, name').order('name');
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los procesos.' });
      } else {
        setProcesses(data);
      }
    };
    fetchProcesses();
  }, [toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.quantity || !formData.category || !formData.responsible_process_id) {
      toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Cantidad, categoría y proceso son obligatorios.' });
      return;
    }
    if (formData.category === 'Otro' && !formData.category_other_description) {
      toast({ variant: 'destructive', title: 'Campo requerido', description: 'Debes describir la categoría "Otro".' });
      return;
    }
    setIsSubmitting(true);

    const payload = {
      production_timer_id: timerId,
      reported_by_user_id: user.id,
      quantity: parseInt(formData.quantity),
      category: formData.category,
      category_other_description: formData.category === 'Otro' ? formData.category_other_description : null,
      responsible_process_id: formData.responsible_process_id,
      notes: formData.notes,
    };

    const { error } = await supabase.from('non_conformities').insert(payload);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo registrar la no conformidad: ${error.message}` });
    } else {
      toast({ title: 'No Conformidad Registrada', description: 'El reporte ha sido guardado exitosamente.' });
      onSuccess();
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="quantity">Cantidad No Conforme</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="Número de unidades defectuosas"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Categoría del Defecto</Label>
        <Select name="category" onValueChange={(value) => handleSelectChange('category', value)} value={formData.category}>
          <SelectTrigger id="category"><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
          <SelectContent>
            {DEFECT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {formData.category === 'Otro' && (
        <div className="space-y-2">
          <Label htmlFor="category_other_description">Descripción de "Otro"</Label>
          <Input
            id="category_other_description"
            name="category_other_description"
            value={formData.category_other_description}
            onChange={handleChange}
            placeholder="Describe el defecto específico"
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="responsible_process_id">Proceso Responsable</Label>
        <Select name="responsible_process_id" onValueChange={(value) => handleSelectChange('responsible_process_id', value)} value={formData.responsible_process_id}>
          <SelectTrigger id="responsible_process_id"><SelectValue placeholder="Seleccionar proceso..." /></SelectTrigger>
          <SelectContent>
            {processes.map(proc => <SelectItem key={proc.id} value={proc.id}>{proc.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas Adicionales</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Detalles adicionales sobre la no conformidad"
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Reportar'}
        </Button>
      </div>
    </form>
  );
};

export default NonConformityForm;