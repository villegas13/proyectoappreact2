import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Warehouse, ArrowRightLeft, BarChart3, Combine } from 'lucide-react';
import CatalogView from '@/components/inventory/catalog/CatalogView';
import WarehousesView from '@/components/inventory/warehouses/WarehousesView';
import MovementsView from '@/components/inventory/movements/MovementsView';
import ReportsView from '@/components/inventory/reports/ReportsView';
import AssemblyView from '@/components/inventory/assembly/AssemblyView';

const InventoryModule = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Módulo de Inventarios
        </h1>
        <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gestiona el catálogo de ítems, bodegas, movimientos y reportes de inventario.
        </p>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="catalog"><Book className="w-4 h-4 mr-2" />Catálogo</TabsTrigger>
          <TabsTrigger value="warehouses"><Warehouse className="w-4 h-4 mr-2" />Bodegas</TabsTrigger>
          <TabsTrigger value="movements"><ArrowRightLeft className="w-4 h-4 mr-2" />Movimientos</TabsTrigger>
          <TabsTrigger value="assembly"><Combine className="w-4 h-4 mr-2" />Ensamble</TabsTrigger>
          <TabsTrigger value="reports"><BarChart3 className="w-4 h-4 mr-2" />Reportes</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <CatalogView />
        </TabsContent>
        <TabsContent value="warehouses">
          <WarehousesView />
        </TabsContent>
        <TabsContent value="movements">
          <MovementsView />
        </TabsContent>
        <TabsContent value="assembly">
          <AssemblyView />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsView />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default InventoryModule;