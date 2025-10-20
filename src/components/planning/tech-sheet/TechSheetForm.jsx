import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { DesignTab } from '@/components/planning/tech-sheet/tabs/DesignTab';
import { MaterialsTab } from '@/components/planning/tech-sheet/tabs/MaterialsTab';
import { CostsTab } from '@/components/planning/tech-sheet/tabs/CostsTab';
import { ProcessesTab } from '@/components/planning/tech-sheet/tabs/ProcessesTab';
import { ProductSearchDialog } from '@/components/planning/tech-sheet/ProductSearchDialog';
import { motion, AnimatePresence } from 'framer-motion';

const steps = ["Diseño", "Materiales", "Costos", "Procesos"];

export const TechSheetForm = ({ techSheet, onSuccess, closeModal, isReadOnly = false }) => {
  const { toast } = useToast();
  const [product, setProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    special_observations: '',
    logo_embroidery: false,
    logo_stamping: false,
    logo_position: '',
  });

  const [frontImage, setFrontImage] = useState({ file: null, preview: null });
  const [backImage, setBackImage] = useState({ file: null, preview: null });
  
  const [materials, setMaterials] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]);
  const [processes, setProcesses] = useState([]);
  
  const totalCost = materials.reduce((acc, mat) => acc + ((mat.cost || 0) * (mat.consumption_per_unit || 0)), 0);

  const fetchFullProduct = useCallback(async (productId) => {
    if (!productId) {
      setProduct(null);
      return;
    }
    const { data, error } = await supabase.from('products').select('*').eq('id', productId).single();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el producto seleccionado.' });
      setProduct(null);
    } else {
      setProduct(data);
    }
  }, [toast]);
  
  const fetchMaterialsForInventory = useCallback(async () => {
      const { data, error } = await supabase.from('inventory_items').select('id, name, reference, unit_of_measure, standard_cost, current_stock');
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los materiales de inventario.' });
      } else {
        setAllMaterials(data);
      }
    }, [toast]);

  const loadTechSheetData = useCallback(async (sheet) => {
    setIsSubmitting(true);
    fetchFullProduct(sheet.product_id);
    setFormData({
      special_observations: sheet.special_observations || '',
      logo_embroidery: sheet.logo_embroidery || false,
      logo_stamping: sheet.logo_stamping || false,
      logo_position: sheet.logo_position || '',
    });

    setFrontImage({ file: null, preview: sheet.front_image_url });
    setBackImage({ file: null, preview: sheet.back_image_url });

    const { data: materialsData, error: materialsError } = await supabase
      .from('tech_sheet_materials')
      .select('*, inventory_items(id, name, reference)')
      .eq('tech_sheet_id', sheet.id);
    
    if (materialsError) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los materiales de la ficha.' });
        console.error(materialsError);
    } else {
        setMaterials(materialsData.map(m => ({
            ...m, 
            material_id: m.material_id, 
            name: m.inventory_items?.name || 'Material no encontrado', 
            reference: m.inventory_items?.reference || 'N/A' 
        })));
    }
    
    const { data: processesData, error: processesError } = await supabase
      .from('tech_sheet_processes')
      .select('*')
      .eq('tech_sheet_id', sheet.id)
      .order('sequence_order');

    if (processesError) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los procesos de la ficha.' });
    else setProcesses(processesData);

    setIsSubmitting(false);
  }, [toast, fetchFullProduct]);


  useEffect(() => {
    fetchMaterialsForInventory();
    if (techSheet) {
      loadTechSheetData(techSheet);
    }
  }, [techSheet, fetchMaterialsForInventory, loadTechSheetData]);

  const handleImageChange = (setter) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setter({ file, preview });
    }
  };

  const uploadImage = async (imageFile, folder, reference) => {
    if (!imageFile) return null;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${reference}-${folder}-${Date.now()}.${fileExt}`;
    const filePath = `tech-sheet-images/${fileName}`;
    
    const { error: uploadError } = await supabase.storage.from('tech-sheet-images').upload(filePath, imageFile);
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Error subiendo imagen: ${uploadError.message}`);
    }
    
    const { data: urlData } = supabase.storage.from('tech-sheet-images').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!product) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar un producto.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const front_image_url = frontImage.file ? await uploadImage(frontImage.file, 'front', product.reference) : techSheet?.front_image_url;
      const back_image_url = backImage.file ? await uploadImage(backImage.file, 'back', product.reference) : techSheet?.back_image_url;
      
      const techSheetPayload = {
        product_id: product.id,
        ...formData,
        front_image_url,
        back_image_url,
      };

      const { data: savedTechSheet, error } = await supabase.from('tech_sheets').upsert(techSheet ? { ...techSheetPayload, id: techSheet.id } : techSheetPayload).select().single();
      if (error) throw error;
      
      const techSheetId = savedTechSheet.id;

      if (techSheet?.id) {
          await supabase.from('tech_sheet_materials').delete().eq('tech_sheet_id', techSheetId);
          await supabase.from('tech_sheet_processes').delete().eq('tech_sheet_id', techSheetId);
      }

      if (materials.length > 0) {
        const materialsToSave = materials
          .filter(m => m.material_id && m.consumption_per_unit > 0)
          .map(m => ({
            tech_sheet_id: techSheetId,
            material_id: m.material_id,
            consumption_per_unit: m.consumption_per_unit,
            unit_of_measure: m.unit_of_measure,
            cost: m.cost
        }));
        if(materialsToSave.length > 0) {
            const { error: materialsError } = await supabase.from('tech_sheet_materials').insert(materialsToSave);
            if (materialsError) throw materialsError;
        }
      }

      if (processes.length > 0) {
        const processesToSave = processes
          .filter(p => p.process_name)
          .map((p, i) => ({
            tech_sheet_id: techSheetId,
            sequence_order: i + 1,
            process_name: p.process_name,
            description: p.description,
            step_by_step: p.step_by_step
        }));
        if(processesToSave.length > 0) {
            const { error: processesError } = await supabase.from('tech_sheet_processes').insert(processesToSave);
            if (processesError) throw processesError;
        }
      }

      toast({ title: 'Éxito', description: 'Ficha técnica guardada correctamente.' });
      onSuccess();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductSelect = (productId) => {
    fetchFullProduct(productId);
    setIsProductSearchOpen(false);
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const progressValue = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-[80vh]">
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-2">
            <Label htmlFor="product-ref">Producto</Label>
            {techSheet || isReadOnly ? (
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <h4 className="font-semibold">{product?.name}</h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{product?.reference} - {product?.description}</p>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setIsProductSearchOpen(true)} className="w-full justify-start">
                {product ? `${product.name} (${product.reference})` : 'Seleccionar producto...'}
              </Button>
            )}
          </div>
          <div className="mt-4">
            <Progress value={progressValue} className="w-full" />
            <div className="flex justify-between text-xs mt-1">
              {steps.map((step, index) => (
                <span key={step} className={currentStep >= index ? 'font-bold' : 'text-muted-foreground'}>{step}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 0 && (
                <DesignTab
                  formData={formData}
                  setFormData={setFormData}
                  frontImage={frontImage}
                  setFrontImage={setFrontImage}
                  backImage={backImage}
                  setBackImage={setBackImage}
                  handleImageChange={handleImageChange}
                  isReadOnly={isReadOnly}
                />
              )}
              {currentStep === 1 && (
                <MaterialsTab 
                  materials={materials} 
                  setMaterials={setMaterials}
                  allMaterials={allMaterials}
                  isReadOnly={isReadOnly}
                />
              )}
              {currentStep === 2 && (
                <CostsTab 
                  materials={materials}
                  setMaterials={setMaterials}
                  allMaterials={allMaterials}
                  totalCost={totalCost}
                  isReadOnly={isReadOnly}
                />
              )}
              {currentStep === 3 && (
                <ProcessesTab 
                  processes={processes}
                  setProcesses={setProcesses}
                  isReadOnly={isReadOnly}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center gap-2 p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div>
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Anterior
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={closeModal}>
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Siguiente
              </Button>
            ) : (
              !isReadOnly && (
                <Button type="submit" disabled={isSubmitting || !product}>
                  {isSubmitting ? 'Guardando...' : 'Guardar Ficha Técnica'}
                </Button>
              )
            )}
          </div>
        </div>
      </form>
      <ProductSearchDialog
        isOpen={isProductSearchOpen}
        onOpenChange={setIsProductSearchOpen}
        onProductSelect={handleProductSelect}
      />
    </>
  );
};