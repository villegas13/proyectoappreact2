import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { PlusCircle, Edit, Trash2, Warehouse as WarehouseIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WarehouseForm } from '@/components/inventory/warehouses/WarehouseForm';
import { LocationForm } from '@/components/inventory/warehouses/LocationForm';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

const WarehousesView = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWarehouseDialogOpen, setIsWarehouseDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: warehousesData, error: warehousesError } = await supabase.from('warehouses').select('*').order('name');
    const { data: locationsData, error: locationsError } = await supabase.from('locations').select('*').order('area, specific_location_code');

    if (warehousesError || locationsError) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los datos de bodegas y ubicaciones." });
    } else {
      setWarehouses(warehousesData);
      setLocations(locationsData);
      if (warehousesData.length > 0 && !selectedWarehouse) {
        setSelectedWarehouse(warehousesData[0]);
      } else if (warehousesData.length === 0) {
        setSelectedWarehouse(null);
      }
    }
    setLoading(false);
  }, [toast, selectedWarehouse]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleSuccess = () => {
    fetchData();
    setIsWarehouseDialogOpen(false);
    setIsLocationDialogOpen(false);
  };

  const handleAddWarehouse = () => {
    setEditingWarehouse(null);
    setIsWarehouseDialogOpen(true);
  };

  const handleEditWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);
    setIsWarehouseDialogOpen(true);
  };

  const handleDeleteWarehouse = async (warehouseId) => {
    if (window.confirm('¿Estás seguro? Eliminar una bodega también eliminará todas sus ubicaciones.')) {
      const { error } = await supabase.from('warehouses').delete().eq('id', warehouseId);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar la bodega: ${error.message}` });
      } else {
        toast({ title: "Éxito", description: "Bodega eliminada." });
        if (selectedWarehouse?.id === warehouseId) {
          setSelectedWarehouse(warehouses.length > 1 ? warehouses.find(w => w.id !== warehouseId) : null);
        }
        fetchData();
      }
    }
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    setIsLocationDialogOpen(true);
  };

  const handleEditLocation = (location) => {
    setEditingLocation(location);
    setIsLocationDialogOpen(true);
  };

  const handleDeleteLocation = async (locationId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta ubicación?')) {
      const { error } = await supabase.from('locations').delete().eq('id', locationId);
      if (error) {
        toast({ variant: "destructive", title: "Error", description: `No se pudo eliminar la ubicación: ${error.message}` });
      } else {
        toast({ title: "Éxito", description: "Ubicación eliminada." });
        fetchData();
      }
    }
  };

  const filteredLocations = selectedWarehouse ? locations.filter(loc => loc.warehouse_id === selectedWarehouse.id) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 h-[calc(100vh-200px)]">
      <ResizablePanelGroup direction="horizontal" className="rounded-lg border" style={{ borderColor: 'var(--border)' }}>
        <ResizablePanel defaultSize={30} minSize={20}>
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center"><WarehouseIcon className="mr-2 h-5 w-5" /> Bodegas</h3>
              <Button onClick={handleAddWarehouse} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir
              </Button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {loading ? <p>Cargando...</p> : (
                <ul className="space-y-2">
                  {warehouses.map(w => (
                    <li key={w.id}
                        onClick={() => setSelectedWarehouse(w)}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${selectedWarehouse?.id === w.id ? 'bg-blue-500/20' : 'hover:bg-secondary'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{w.name}</span>
                        <div className="space-x-1 opacity-0 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEditWarehouse(w); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteWarehouse(w.id); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{w.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <div className="p-4 h-full flex flex-col">
            {selectedWarehouse ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center"><MapPin className="mr-2 h-5 w-5" /> Ubicaciones en {selectedWarehouse.name}</h3>
                  <Button onClick={handleAddLocation} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ubicación
                  </Button>
                </div>
                <div className="flex-grow overflow-y-auto rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área</TableHead>
                        <TableHead>Ubicación Específica</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map(loc => (
                          <TableRow key={loc.id}>
                            <TableCell>{loc.area}</TableCell>
                            <TableCell className="font-medium">{loc.specific_location_code}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditLocation(loc)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteLocation(loc.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan="3" className="text-center">No hay ubicaciones en esta bodega.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Selecciona una bodega para ver sus ubicaciones.</p>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={isWarehouseDialogOpen} onOpenChange={setIsWarehouseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Editar Bodega' : 'Crear Nueva Bodega'}</DialogTitle>
            <DialogDescription>{editingWarehouse ? 'Actualiza los detalles.' : 'Añade una nueva bodega.'}</DialogDescription>
          </DialogHeader>
          <WarehouseForm warehouse={editingWarehouse} onSuccess={handleSuccess} closeModal={() => setIsWarehouseDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Editar Ubicación' : 'Crear Nueva Ubicación'}</DialogTitle>
            <DialogDescription>Añade una ubicación a la bodega: {selectedWarehouse?.name}</DialogDescription>
          </DialogHeader>
          <LocationForm location={editingLocation} warehouseId={selectedWarehouse?.id} onSuccess={handleSuccess} closeModal={() => setIsLocationDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default WarehousesView;