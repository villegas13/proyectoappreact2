import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Package, AlertTriangle, DollarSign } from 'lucide-react';
import KardexReport from '@/components/inventory/reports/KardexReport';
import StockByLocationReport from '@/components/inventory/reports/StockByLocationReport';
import StockAlertsReport from '@/components/inventory/reports/StockAlertsReport';
import InventoryValuationReport from '@/components/inventory/reports/InventoryValuationReport';

const ReportsView = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Reportes de Inventario</h3>
      
      <Tabs defaultValue="kardex" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="kardex"><FileText className="w-4 h-4 mr-2" />Kardex por Producto</TabsTrigger>
          <TabsTrigger value="stock_location"><Package className="w-4 h-4 mr-2" />Stock por Ubicación</TabsTrigger>
          <TabsTrigger value="stock_alerts"><AlertTriangle className="w-4 h-4 mr-2" />Alertas de Stock</TabsTrigger>
          <TabsTrigger value="valuation"><DollarSign className="w-4 h-4 mr-2" />Valorización</TabsTrigger>
        </TabsList>
        <TabsContent value="kardex" className="mt-4">
          <KardexReport />
        </TabsContent>
        <TabsContent value="stock_location" className="mt-4">
          <StockByLocationReport />
        </TabsContent>
        <TabsContent value="stock_alerts" className="mt-4">
          <StockAlertsReport />
        </TabsContent>
        <TabsContent value="valuation" className="mt-4">
          <InventoryValuationReport />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ReportsView;