import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit } from 'lucide-react';

const ProcessForm = ({ process, onSuccess }) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (process) {
      setName(process.name);
      setDescription(process.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [process, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase.from('processes').upsert({ id: process?.id, name, description });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudo guardar el proceso: ${error.message}` });
    } else {
      toast({ title: 'Éxito', description: `Proceso ${process ? 'actualizado' : 'creado'} correctamente.` });
      onSuccess();
      setOpen(false);
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {process ? (
          <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
        ) : (
          <Button className="bg-green-600 hover:bg-green-700 text-white"><PlusCircle className="mr-2 h-4 w-4" /> Crear Proceso</Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{process ? 'Editar' : 'Crear'} Proceso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Nombre del Proceso</Label>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Costura" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-desc">Descripción</Label>
              <Input id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessForm;