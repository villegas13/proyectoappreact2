import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ProductionLogForm = ({ timerId, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [producedUnits, setProducedUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!producedUnits || parseInt(producedUnits) <= 0) {
      toast({ variant: 'destructive', title: 'Dato inválido', description: 'Debes ingresar una cantidad de unidades válida.' });
      return;
    }
    setIsSubmitting(true);

    const logPayload = {
      timer_id: timerId,
      log_time: new Date().toISOString(),
      produced_units: parseInt(producedUnits),
      notes,
    };

    const { error: logError } = await supabase.from('production_logs').insert(logPayload);

    if (logError) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo registrar el avance: ${logError.message}` });
      setIsSubmitting(false);
      return;
    }
    
    toast({ title: 'Avance Registrado', description: `${producedUnits} unidades añadidas.` });
    onSuccess();
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="produced_units">Unidades Producidas</Label>
        <Input
          id="produced_units"
          type="number"
          value={producedUnits}
          onChange={(e) => setProducedUnits(e.target.value)}
          placeholder="Cantidad de unidades terminadas en este intervalo"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anotaciones sobre la producción, calidad, etc."
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Registrando...' : 'Registrar Avance'}</Button>
      </div>
    </form>
  );
};

export default ProductionLogForm;