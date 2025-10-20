import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Wrench, ClipboardList, BarChartBig } from 'lucide-react';
import CostCentersView from '@/components/costs/CostCentersView';
import ProductionOrderCostsView from '@/components/costs/ProductionOrderCostsView';
import CostConfigurationView from '@/components/costs/CostConfigurationView';
import CostReportsView from '@/components/costs/CostReportsView';

const CostsModule = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Módulo de Costos de Producción
        </h1>
        <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gestiona y analiza los costos asociados a tu producción.
        </p>
      </div>

      <Tabs defaultValue="centers" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="centers"><Building className="w-4 h-4 mr-2" />Centros de Costo</TabsTrigger>
          <TabsTrigger value="config"><Wrench className="w-4 h-4 mr-2" />Configuración</TabsTrigger>
          <TabsTrigger value="orders"><ClipboardList className="w-4 h-4 mr-2" />Costos por OP</TabsTrigger>
          <TabsTrigger value="reports"><BarChartBig className="w-4 h-4 mr-2" />Reportes</TabsTrigger>
        </TabsList>
        <TabsContent value="centers" className="mt-4">
          <CostCentersView />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <CostConfigurationView />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <ProductionOrderCostsView />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <CostReportsView />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default CostsModule;