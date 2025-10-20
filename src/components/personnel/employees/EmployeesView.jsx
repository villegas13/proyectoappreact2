import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import EmployeeForm from '@/components/personnel/employees/EmployeeForm';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const statusColors = {
  'Activo': 'bg-green-500',
  'Inactivo': 'bg-yellow-500',
  'Retirado': 'bg-red-500',
};

const EmployeesView = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { profile } = useAuth();

  const canManage = profile?.role === 'SuperAdministrador' || profile?.role === 'Administrador';

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los empleados.' });
    } else {
      setEmployees(data);
      setFilteredEmployees(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const results = employees.filter(employee =>
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.document_id && employee.document_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.area && employee.area.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredEmployees(results);
  }, [searchTerm, employees]);

  const handleAddNew = () => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para añadir empleados.' });
      return;
    }
    setEditingEmployee(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (employee) => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para editar empleados.' });
      return;
    }
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDelete = async (employeeId) => {
    if (!canManage) {
      toast({ variant: 'destructive', title: 'Acción no permitida', description: 'No tienes permiso para eliminar empleados.' });
      return;
    }
    if (window.confirm('¿Estás seguro de que quieres eliminar este empleado? Esta acción no se puede deshacer.')) {
      const { error } = await supabase.from('employees').delete().eq('id', employeeId);
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } else {
        toast({ title: 'Éxito', description: 'Empleado eliminado correctamente.' });
        fetchEmployees();
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, documento, área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleAddNew} className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 shadow-md">
          <PlusCircle className="mr-2 h-4 w-4" /> + Añadir Empleado
        </Button>
      </div>

      <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Estado</TableHead>
              {canManage && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={canManage ? 6 : 5} className="text-center">Cargando empleados...</TableCell></TableRow>
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {emp.photo_url && <img src={emp.photo_url} alt={emp.full_name} className="w-full h-full rounded-full object-cover" />}
                    </div>
                    {emp.full_name}
                  </TableCell>
                  <TableCell>{emp.document_id}</TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>{emp.area}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[emp.status] || 'bg-gray-500'} text-white`}>{emp.status}</Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={canManage ? 6 : 5} className="text-center">No se encontraron empleados.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Editar Empleado' : 'Crear Nuevo Empleado'}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? 'Actualiza los detalles del empleado.' : 'Completa el formulario para registrar un nuevo empleado.'}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm 
            employee={editingEmployee} 
            onSuccess={() => {
              fetchEmployees();
              setIsDialogOpen(false);
            }} 
            closeModal={() => setIsDialogOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default EmployeesView;