import React, { useState, useEffect, useCallback } from 'react';
    import { motion } from 'framer-motion';
    import { supabase } from '@/lib/customSupabaseClient';
    import { useToast } from '@/components/ui/use-toast';
    import { PlusCircle, Edit, Trash2, Eye, FileDown } from 'lucide-react';
    import { Button } from '@/components/ui/button';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
    import { TechSheetForm } from '@/components/planning/tech-sheet/TechSheetForm';

    const TechSheetView = () => {
      const [techSheets, setTechSheets] = useState([]);
      const [loading, setLoading] = useState(true);
      const [isDialogOpen, setIsDialogOpen] = useState(false);
      const [selectedTechSheet, setSelectedTechSheet] = useState(null);
      const [isReadOnly, setIsReadOnly] = useState(false);
      const { toast } = useToast();

      const fetchTechSheets = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('tech_sheets')
          .select('*, products(name, reference)')
          .order('created_at', { ascending: false });

        if (error) {
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las fichas técnicas." });
        } else {
          setTechSheets(data);
        }
        setLoading(false);
      }, [toast]);

      useEffect(() => {
        fetchTechSheets();
      }, [fetchTechSheets]);

      const handleAddNew = () => {
        setSelectedTechSheet(null);
        setIsReadOnly(false);
        setIsDialogOpen(true);
      };

      const handleEdit = (sheet) => {
        setSelectedTechSheet(sheet);
        setIsReadOnly(false);
        setIsDialogOpen(true);
      };

      const handleView = (sheet) => {
        setSelectedTechSheet(sheet);
        setIsReadOnly(true);
        setIsDialogOpen(true);
      };

      const handleDelete = async (sheetId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta ficha técnica?')) {
          const { error } = await supabase.from('tech_sheets').delete().eq('id', sheetId);
          if (error) {
            toast({ variant: "destructive", title: "Error", description: error.message });
          } else {
            toast({ title: "Éxito", description: "Ficha técnica eliminada." });
            fetchTechSheets();
          }
        }
      };

      const handleExportPDF = (sheet) => {
        toast({ title: 'Exportando a PDF...', description: 'Esta función no está implementada aún. ¡Solicítala!' });
      };

      const getDialogTitle = () => {
        if (isReadOnly) return `Visualizando Ficha Técnica: ${selectedTechSheet?.products?.reference || ''}`;
        if (selectedTechSheet) return 'Editar Ficha Técnica';
        return 'Crear Nueva Ficha Técnica';
      };

      const getDialogDescription = () => {
        if (isReadOnly) return 'Revisa todos los detalles de la ficha técnica.';
        if (selectedTechSheet) return 'Actualiza los detalles de la ficha técnica.';
        return 'Completa el formulario para crear una nueva ficha técnica.';
      };

      return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Listado de Fichas Técnicas</h3>
            <Button onClick={handleAddNew} className="bg-blue-500 hover:bg-blue-600 text-white">
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Ficha Técnica
            </Button>
          </div>

          <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Nombre Producto</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan="4" className="text-center">Cargando...</TableCell></TableRow>
                ) : techSheets.length > 0 ? (
                  techSheets.map((sheet) => (
                    <TableRow key={sheet.id}>
                      <TableCell className="font-medium">{sheet.products.reference}</TableCell>
                      <TableCell>{sheet.products.name}</TableCell>
                      <TableCell>{new Date(sheet.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleExportPDF(sheet)}><FileDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleView(sheet)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(sheet)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(sheet.id)} className="text-red-500 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan="4" className="text-center">No hay fichas técnicas para mostrar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-6xl">
              <DialogHeader>
                <DialogTitle>{getDialogTitle()}</DialogTitle>
                <DialogDescription>
                  {getDialogDescription()}
                </DialogDescription>
              </DialogHeader>
              <TechSheetForm 
                techSheet={selectedTechSheet} 
                onSuccess={() => {
                  fetchTechSheets();
                  setIsDialogOpen(false);
                }} 
                closeModal={() => setIsDialogOpen(false)}
                isReadOnly={isReadOnly}
              />
            </DialogContent>
          </Dialog>
        </motion.div>
      );
    };

    export default TechSheetView;