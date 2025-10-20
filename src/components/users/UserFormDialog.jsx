import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export const UserFormDialog = ({ isOpen, setIsOpen, editingUser, roles, onSuccess, currentUserRole }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: '',
    status: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();

  useEffect(() => {
    if (isOpen) {
      if (editingUser) {
        setFormData({
          first_name: editingUser.full_name.split(' ')[0] || '',
          last_name: editingUser.full_name.split(' ').slice(1).join(' ') || '',
          email: editingUser.email || '',
          password: '',
          role: editingUser.role || 'Usuario',
          status: editingUser.status,
        });
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          password: '',
          role: 'Usuario',
          status: true,
        });
      }
    }
  }, [editingUser, isOpen]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (currentUserRole === 'Administrador' && formData.role === 'SuperAdministrador') {
        toast({ variant: "destructive", title: "Acción no permitida", description: "No puedes asignar el rol de SuperAdministrador." });
        return;
    }
     if (currentUserRole === 'Administrador' && editingUser?.role === 'SuperAdministrador') {
        toast({ variant: "destructive", title: "Acción no permitida", description: "No puedes modificar a un SuperAdministrador." });
        return;
    }

    setIsSubmitting(true);
    
    try {
        let action = '';
        let payload = {};

        if (editingUser) {
            action = 'update';
            payload = { id: editingUser.id, ...formData };
        } else {
            action = 'create';
            payload = { ...formData };
        }

        const { error } = await supabase.functions.invoke('manage-user', {
            body: { action, payload },
            headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (error) throw new Error(error.message);

        toast({ title: "Éxito", description: `Usuario ${editingUser ? 'actualizado' : 'creado/invitado'} correctamente.` });
        onSuccess();
        setIsOpen(false);
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const filteredRoles = roles.filter(role => {
    if (currentUserRole === 'SuperAdministrador') return true;
    if (currentUserRole === 'Administrador') return role !== 'SuperAdministrador';
    return false;
  });

  const canEdit = !(currentUserRole === 'Administrador' && editingUser?.role === 'SuperAdministrador');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
          <DialogDescription>
            {editingUser ? 'Actualiza los detalles del usuario.' : 'Completa el formulario para invitar a un nuevo usuario.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="first_name">Nombre</Label>
                    <Input id="first_name" name="first_name" value={formData.first_name} onChange={handleInputChange} required disabled={!canEdit} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="last_name">Apellido</Label>
                    <Input id="last_name" name="last_name" value={formData.last_name} onChange={handleInputChange} required disabled={!canEdit} />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={!!editingUser} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">{editingUser ? 'Nueva Contraseña' : 'Contraseña'}</Label>
                <Input id="password" name="password" type="password" onChange={handleInputChange} placeholder={editingUser ? 'Dejar en blanco para no cambiar' : 'Contraseña temporal'} disabled={!canEdit} required={!editingUser} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                 <Select onValueChange={(value) => setFormData(p => ({...p, role: value}))} value={formData.role} disabled={!canEdit}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        {filteredRoles.map(role => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            {editingUser && (
                 <div className="flex items-center space-x-2">
                    <Switch id="status" checked={formData.status} onCheckedChange={(checked) => setFormData(p => ({...p, status: checked}))} disabled={!canEdit} />
                    <Label htmlFor="status">Usuario Activo</Label>
                </div>
            )}
            <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !canEdit}>{isSubmitting ? 'Guardando...' : 'Guardar Cambios'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};