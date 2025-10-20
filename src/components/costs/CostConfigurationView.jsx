import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Users, Package, Percent } from 'lucide-react';

const CostConfigurationView = () => {
  const { toast } = useToast();
  const [costCenters, setCostCenters] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: centersData, error: centersError } = await supabase
      .from('cost_centers')
      .select('*')
      .order('name');
    
    const { data: materialsData, error: materialsError } = await supabase
      .from('inventory_items')
      .select('id, name, reference, cost_center_id')
      .order('name');

    if (centersError || materialsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de configuración.' });
    } else {
      setCostCenters(centersData.map(c => ({
        ...c,
        labor_cost_per_minute: c.labor_cost_per_minute ?? 0,
        indirect_cost_percentage: c.indirect_cost_percentage ?? 0,
      })));
      setMaterials(materialsData);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCenterChange = (id, field, value) => {
    setCostCenters(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleMaterialChange = (id, cost_center_id) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, cost_center_id } : m));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const centerUpdates = costCenters.map(({ id, labor_cost_per_minute, indirect_cost_percentage }) => ({
        id,
        labor_cost_per_minute: parseFloat(labor_cost_per_minute) || 0,
        indirect_cost_percentage: parseFloat(indirect_cost_percentage) || 0,
      }));

      const materialUpdates = materials.map(({ id, cost_center_id }) => ({
        id,
        cost_center_id,
      }));

      const { error: centerError } = await supabase.from('cost_centers').upsert(centerUpdates);
      if (centerError) throw centerError;

      const { error: materialError } = await supabase.from('inventory_items').upsert(materialUpdates);
      if (materialError) throw materialError;

      toast({ title: 'Éxito', description: 'Configuración de costos guardada.' });
      fetchData();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Configuración de Costos</h3>
        <Button onClick={handleSave} disabled={isSubmitting || loading}>
          <Save className="mr-2 h-4 w-4" /> {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>

      {loading ? <p>Cargando configuración...</p> : (
        <Accordion type="multiple" defaultValue={['labor', 'materials', 'indirect']} className="w-full space-y-4">
          <AccordionItem value="labor" className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <AccordionTrigger className="text-lg font-semibold"><Users className="mr-2 h-5 w-5" />Mano de Obra</AccordionTrigger>
            <AccordionContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-4">Define el costo por minuto para cada centro de costo productivo.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {costCenters.filter(c => c.type === 'Productivo').map(center => (
                  <div key={center.id} className="space-y-2">
                    <Label htmlFor={`labor-${center.id}`}>{center.name}</Label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        id={`labor-${center.id}`}
                        type="number"
                        step="0.01"
                        value={center.labor_cost_per_minute}
                        onChange={(e) => handleCenterChange(center.id, 'labor_cost_per_minute', e.target.value)}
                        className="pl-6 pr-16"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">/ min</span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="materials" className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <AccordionTrigger className="text-lg font-semibold"><Package className="mr-2 h-5 w-5" />Materiales</AccordionTrigger>
            <AccordionContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-4">Asigna cada material a un centro de costo para el cálculo automático.</p>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead>Centro de Costo Asignado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map(material => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.reference} - {material.name}</TableCell>
                        <TableCell>
                          <Select
                            value={material.cost_center_id || ''}
                            onValueChange={(value) => handleMaterialChange(material.id, value || null)}
                          >
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>Ninguno</SelectItem>
                              {costCenters.map(cc => <SelectItem key={cc.id} value={cc.id}>{cc.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="indirect" className="rounded-lg border p-4" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <AccordionTrigger className="text-lg font-semibold"><Percent className="mr-2 h-5 w-5" />Gastos Indirectos</AccordionTrigger>
            <AccordionContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-4">Define el porcentaje de gastos indirectos de fabricación (GIF) a aplicar sobre el costo de mano de obra directa de cada centro.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {costCenters.map(center => (
                  <div key={center.id} className="space-y-2">
                    <Label htmlFor={`indirect-${center.id}`}>{center.name}</Label>
                    <div className="relative">
                      <Input
                        id={`indirect-${center.id}`}
                        type="number"
                        step="0.1"
                        value={center.indirect_cost_percentage}
                        onChange={(e) => handleCenterChange(center.id, 'indirect_cost_percentage', e.target.value)}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </motion.div>
  );
};

export default CostConfigurationView;