import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package, ShoppingCart, ClipboardList, Layers } from 'lucide-react';
import ProductsView from '@/components/planning/ProductsView';
import TechSheetView from '@/components/planning/TechSheetView';
import ProductionOrdersView from '@/components/planning/production-orders/ProductionOrdersView';
import MaterialsExplosionView from '@/components/planning/materials-explosion/MaterialsExplosionView';
import PurchaseRequisitionsView from '@/components/planning/purchase-requisitions/PurchaseRequisitionsView';
import { useToast } from '@/components/ui/use-toast';

const PlaceholderContent = ({ title }) => {
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: `Módulo ${title}`,
      description: "🚧 Esta función no está implementada aún—¡pero no te preocupes! ¡Puedes solicitarla en tu próximo prompt! 🚀",
    });
  }, [title, toast]);

  return (
    <div className="p-6 rounded-xl card-shadow flex flex-col items-center justify-center h-96" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <FileText className="w-16 h-16 mb-4" style={{ color: 'var(--text-muted)' }} />
      <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
        Esta sección está en desarrollo. ¡Vuelve pronto!
      </p>
    </div>
  );
};

const PlanningModule = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Módulo de Planeación
        </h1>
        <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gestiona productos, fichas técnicas, órdenes de producción y más.
        </p>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="products"><Package className="w-4 h-4 mr-2" />Productos</TabsTrigger>
          <TabsTrigger value="tech-sheet"><FileText className="w-4 h-4 mr-2" />Ficha Técnica</TabsTrigger>
          <TabsTrigger value="materials-explosion"><Layers className="w-4 h-4 mr-2" />Explosión Mat.</TabsTrigger>
          <TabsTrigger value="purchase-req"><ShoppingCart className="w-4 h-4 mr-2" />Req. Compras</TabsTrigger>
          <TabsTrigger value="production-order"><ClipboardList className="w-4 h-4 mr-2" />Órdenes Prod.</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsView />
        </TabsContent>
        <TabsContent value="tech-sheet">
          <TechSheetView />
        </TabsContent>
        <TabsContent value="materials-explosion">
          <MaterialsExplosionView />
        </TabsContent>
        <TabsContent value="purchase-req">
          <PurchaseRequisitionsView />
        </TabsContent>
        <TabsContent value="production-order">
          <ProductionOrdersView />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default PlanningModule;