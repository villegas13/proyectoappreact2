import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { PlusCircle, Edit, Trash2, KeyRound, PowerOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserFormDialog } from '@/components/users/UserFormDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const UsersModule = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { toast } = useToast();
  const { profile: currentUserProfile, session } = useAuth();
  
  const ROLES = ['SuperAdministrador', 'Administrador', 'Supervisor', 'Usuario'];

  const fetchUsers = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    
    const { data, error } = await supabase.functions.invoke('list-users', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (error) {
        toast({ variant: "destructive", title: "Error", description: `No se pudieron cargar los usuarios: ${error.message}` });
        setLoading(false);
        return;
    }
    
    setUsers(data);
    setLoading(false);
  }, [toast, session]);

  useEffect(() => {
    if(currentUserProfile?.role === 'Administrador' || currentUserProfile?.role === 'SuperAdministrador') {
      fetchUsers();
    }
  }, [fetchUsers, currentUserProfile]);

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };
  
  const handleAddNew = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  }

  const handleDelete = async (userId, userRole) => {
    if (currentUserProfile.role !== 'SuperAdministrador' && userRole === 'Administrador') {
        toast({ variant: "destructive", title: "Acción no permitida", description: "Los administradores no pueden eliminar a otros administradores." });
        return;
    }
    if (userRole === 'SuperAdministrador') {
        toast({ variant: "destructive", title: "Acción no permitida", description: "No se puede eliminar al SuperAdministrador." });
        return;
    }

    const { error } = await supabase.functions.invoke('manage-user', {
      body: { action: 'delete', payload: { id: userId } },
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (error) {
      toast({ variant: "destructive", title: "Error", description: `Error al eliminar usuario: ${error.message}` });
    } else {
      toast({ title: "Éxito", description: "Usuario eliminado correctamente." });
      fetchUsers();
    }
  };
  
  const handleDeactivate = async (userId, userRole, currentStatus) => {
    if (userRole === 'SuperAdministrador') {
        toast({ variant: "destructive", title: "Acción no permitida", description: "No se puede desactivar al SuperAdministrador." });
        return;
    }
    const { error } = await supabase.from('users_roles').update({ status: !currentStatus }).eq('user_id', userId);
    if(error){
       toast({ variant: "destructive", title: "Error", description: `Error al cambiar estado: ${error.message}` });
    } else {
       toast({ title: "Éxito", description: "Estado del usuario actualizado." });
       fetchUsers();
    }
  }

  const handleResetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
     if(error){
       toast({ variant: "destructive", title: "Error", description: `Error al enviar correo: ${error.message}` });
    } else {
       toast({ title: "Éxito", description: `Enlace de reseteo de contraseña enviado a ${email}.` });
    }
  }

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'SuperAdministrador':
        return 'destructive';
      case 'Administrador':
        return 'default';
      case 'Supervisor':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Gestión de Usuarios</h1>
          <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>Crea, edita y gestiona los usuarios del sistema.</p>
        </div>
        <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Crear Usuario
        </Button>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre completo</TableHead>
              <TableHead>Correo electrónico</TableHead>
              <TableHead>Rol asignado</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha de creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan="6" className="text-center">Cargando usuarios...</TableCell></TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Badge variant={getRoleBadgeVariant(user.role)}>{user.role}</Badge></TableCell>
                <TableCell>
                  <Badge variant={user.status ? 'success' : 'destructive'}>
                    {user.status ? 'Activo' : 'Inactivo'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right space-x-1">
                   <Button variant="ghost" size="icon" onClick={() => handleEdit(user)} className="text-blue-500 hover:text-blue-600" title="Editar">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleResetPassword(user.email)} className="text-yellow-500 hover:text-yellow-600" title="Resetear contraseña">
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeactivate(user.id, user.role, user.status)} className="text-orange-500 hover:text-orange-600" title={user.status ? 'Desactivar' : 'Activar'}>
                    <PowerOff className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. Esto eliminará permanentemente la cuenta del usuario y sus datos de nuestros servidores.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(user.id, user.role)} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

       <UserFormDialog 
          isOpen={isFormOpen} 
          setIsOpen={setIsFormOpen}
          editingUser={editingUser}
          roles={ROLES}
          onSuccess={fetchUsers}
          currentUserRole={currentUserProfile.role}
        />
    </motion.div>
  );
};

export default UsersModule;