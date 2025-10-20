import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera } from 'lucide-react';

const EmployeeForm = ({ employee, onSuccess, closeModal }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    full_name: '',
    document_id: '',
    position: '',
    area: '',
    hire_date: '',
    contract_type: '',
    assigned_shift: '',
    base_salary: '',
    status: 'Activo',
    photo_url: '',
    contact_info: { phone: '', address: '' },
    health_info: { eps: '', arl: '' },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name || '',
        document_id: employee.document_id || '',
        position: employee.position || '',
        area: employee.area || '',
        hire_date: employee.hire_date || '',
        contract_type: employee.contract_type || '',
        assigned_shift: employee.assigned_shift || '',
        base_salary: employee.base_salary || '',
        status: employee.status || 'Activo',
        photo_url: employee.photo_url || '',
        contact_info: employee.contact_info || { phone: '', address: '' },
        health_info: employee.health_info || { eps: '', arl: '' },
      });
      setPreviewUrl(employee.photo_url);
    }
  }, [employee]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleJsonChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return formData.photo_url || null;

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${formData.document_id || 'new-employee'}-${Date.now()}.${fileExt}`;
    const filePath = `employee-photos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, photoFile, { upsert: true });

    if (uploadError) {
      throw new Error(`Error al subir la foto: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const photoUrl = await uploadPhoto();

      const payload = {
        ...formData,
        photo_url: photoUrl,
        base_salary: parseFloat(formData.base_salary) || null,
        hire_date: formData.hire_date || null,
      };
      
      let query;
      if (employee) {
        query = supabase.from('employees').update(payload).eq('id', employee.id);
      } else {
        query = supabase.from('employees').insert(payload);
      }

      const { error } = await query;

      if (error) throw error;

      toast({ title: 'Éxito', description: `Empleado ${employee ? 'actualizado' : 'creado'} correctamente.` });
      onSuccess();
      closeModal();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 flex flex-col items-center space-y-4">
          <div className="relative w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Foto" className="w-full h-full rounded-full object-cover" />
            ) : (
              <Camera className="w-12 h-12 text-gray-400" />
            )}
            <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1.5 cursor-pointer hover:bg-blue-600">
              <Camera className="w-4 h-4" />
            </label>
            <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>
          <div className="w-full space-y-2">
            <Label>Estado</Label>
            <Select onValueChange={(v) => setFormData(p => ({ ...p, status: v }))} value={formData.status}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="Retirado">Retirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="md:col-span-3">
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básica</TabsTrigger>
              <TabsTrigger value="contract">Contractual</TabsTrigger>
              <TabsTrigger value="contact">Contacto y Salud</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document_id">Documento</Label>
                  <Input id="document_id" name="document_id" value={formData.document_id} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input id="position" name="position" value={formData.position} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Área/Módulo</Label>
                  <Input id="area" name="area" value={formData.area} onChange={handleInputChange} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contract" className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hire_date">Fecha de Ingreso</Label>
                  <Input id="hire_date" name="hire_date" type="date" value={formData.hire_date} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Tipo de Contrato</Label>
                  <Input id="contract_type" name="contract_type" value={formData.contract_type} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_shift">Turno Asignado</Label>
                  <Input id="assigned_shift" name="assigned_shift" value={formData.assigned_shift} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_salary">Salario Base</Label>
                  <Input id="base_salary" name="base_salary" type="number" value={formData.base_salary} onChange={handleInputChange} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={formData.contact_info.phone} onChange={(e) => handleJsonChange('contact_info', 'phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" value={formData.contact_info.address} onChange={(e) => handleJsonChange('contact_info', 'address', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eps">EPS</Label>
                  <Input id="eps" value={formData.health_info.eps} onChange={(e) => handleJsonChange('health_info', 'eps', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arl">ARL</Label>
                  <Input id="arl" value={formData.health_info.arl} onChange={(e) => handleJsonChange('health_info', 'arl', e.target.value)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
};

export default EmployeeForm;