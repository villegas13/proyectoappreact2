import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, FileText, Package, Building, DollarSign } from 'lucide-react';

const PlaceholderReport = ({ title }) => (
  <div className="p-6 rounded-lg border flex flex-col items-center justify-center h-80" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
    <FileText className="w-12 h-12 mb-4 text-muted-foreground" />
    <h4 className="text-lg font-semibold text-primary">{title}</h4>
    <p className="mt-2 text-sm text-center text-secondary">
      Este reporte está en desarrollo. ¡Vuelve pronto para más análisis!
    </p>
  </div>
);

const ReportByOrder = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase.from('production_orders').select('id, code').order('code');
      if (error) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar las órdenes de producción.' });
      else setOrders(data);
    };
    fetchOrders();
  }, [toast]);

  const handleOrderChange = async (orderId) => {
    if (!orderId) {
      setSelectedOrder(null);
      setReportData(null);
      return;
    }
    setSelectedOrder(orderId);
    setLoading(true);
    const { data, error } = await supabase
      .from('production_order_costs')
      .select('*, cost_centers(name)')
      .eq('production_order_id', orderId);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el reporte.' });
      setReportData(null);
    } else {
      const groupedByCenter = data.reduce((acc, item) => {
        const centerName = item.cost_centers.name;
        if (!acc[centerName]) {
          acc[centerName] = { estimated: 0, actual: 0, types: {} };
        }
        acc[centerName].estimated += item.estimated_cost || 0;
        acc[centerName].actual += item.actual_cost || item.estimated_cost || 0;
        
        if (!acc[centerName].types[item.cost_type]) {
          acc[centerName].types[item.cost_type] = { estimated: 0, actual: 0 };
        }
        acc[centerName].types[item.cost_type].estimated += item.estimated_cost || 0;
        acc[centerName].types[item.cost_type].actual += item.actual_cost || item.estimated_cost || 0;

        return acc;
      }, {});
      setReportData(groupedByCenter);
    }
    setLoading(false);
  };

  const renderVariation = (estimated, actual) => {
    if (estimated === 0) return <span className="text-gray-500">-</span>;
    const variation = ((actual - estimated) / estimated) * 100;
    const color = variation > 10 ? 'text-red-500' : variation > 5 ? 'text-yellow-500' : 'text-green-500';
    const Icon = variation > 0 ? TrendingUp : TrendingDown;
    return (
      <span className={`flex items-center font-semibold ${color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {variation.toFixed(2)}%
      </span>
    );
  };

  const totalEstimated = reportData ? Object.values(reportData).reduce((sum, center) => sum + center.estimated, 0) : 0;
  const totalActual = reportData ? Object.values(reportData).reduce((sum, center) => sum + center.actual, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="w-full md:w-1/3">
        <Select onValueChange={handleOrderChange} value={selectedOrder || ''}>
          <SelectTrigger><SelectValue placeholder="Selecciona una Orden de Producción..." /></SelectTrigger>
          <SelectContent>
            {orders.map(o => <SelectItem key={o.id} value={o.id}>{o.code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {loading && <p>Generando reporte...</p>}
      {reportData && !loading && (
        <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Centro de Costo / Tipo</TableHead>
                <TableHead className="text-right">Costo Estimado</TableHead>
                <TableHead className="text-right">Costo Real</TableHead>
                <TableHead className="text-right">Variación</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(reportData).map(([centerName, data]) => (
                <React.Fragment key={centerName}>
                  <TableRow className="font-bold" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <TableCell>{centerName}</TableCell>
                    <TableCell className="text-right">${data.estimated.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${data.actual.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{renderVariation(data.estimated, data.actual)}</TableCell>
                  </TableRow>
                  {Object.entries(data.types).map(([typeName, typeData]) => (
                    <TableRow key={typeName}>
                      <TableCell className="pl-8 text-muted-foreground">{typeName}</TableCell>
                      <TableCell className="text-right">${typeData.estimated.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${typeData.actual.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{renderVariation(typeData.estimated, typeData.actual)}</TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
            <TableRow className="font-extrabold text-lg border-t-2">
              <TableCell>Total General</TableCell>
              <TableCell className="text-right">${totalEstimated.toFixed(2)}</TableCell>
              <TableCell className="text-right">${totalActual.toFixed(2)}</TableCell>
              <TableCell className="text-right">{renderVariation(totalEstimated, totalActual)}</TableCell>
            </TableRow>
          </Table>
        </div>
      )}
    </div>
  );
};

const ReportByCostCenter = () => {
  const [costCenters, setCostCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCenters = async () => {
      const { data, error } = await supabase.from('cost_centers').select('id, name').order('name');
      if (error) toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los centros de costo.' });
      else setCostCenters(data);
    };
    fetchCenters();
  }, [toast]);

  const handleCenterChange = async (centerId) => {
    if (!centerId) {
      setSelectedCenter(null);
      setReportData(null);
      return;
    }
    setSelectedCenter(centerId);
    setLoading(true);
    const { data, error } = await supabase
      .from('production_order_costs')
      .select('cost_type, estimated_cost, actual_cost')
      .eq('cost_center_id', centerId);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el reporte.' });
      setReportData(null);
    } else {
      const summary = data.reduce((acc, item) => {
        const type = item.cost_type;
        if (!acc[type]) {
          acc[type] = { estimated: 0, actual: 0 };
        }
        acc[type].estimated += item.estimated_cost || 0;
        acc[type].actual += item.actual_cost || item.estimated_cost || 0;
        return acc;
      }, {});
      setReportData(summary);
    }
    setLoading(false);
  };

  const totalEstimated = reportData ? Object.values(reportData).reduce((sum, type) => sum + type.estimated, 0) : 0;
  const totalActual = reportData ? Object.values(reportData).reduce((sum, type) => sum + type.actual, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="w-full md:w-1/3">
        <Select onValueChange={handleCenterChange} value={selectedCenter || ''}>
          <SelectTrigger><SelectValue placeholder="Selecciona un Centro de Costo..." /></SelectTrigger>
          <SelectContent>
            {costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {loading && <p>Generando reporte...</p>}
      {reportData && !loading && (
        <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Costo</TableHead>
                <TableHead className="text-right">Total Estimado</TableHead>
                <TableHead className="text-right">Total Real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(reportData).map(([typeName, data]) => (
                <TableRow key={typeName}>
                  <TableCell className="font-medium">{typeName}</TableCell>
                  <TableCell className="text-right">${data.estimated.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${data.actual.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableRow className="font-bold border-t-2">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">${totalEstimated.toFixed(2)}</TableCell>
              <TableCell className="text-right">${totalActual.toFixed(2)}</TableCell>
            </TableRow>
          </Table>
        </div>
      )}
    </div>
  );
};

const CostReportsView = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Reportes de Costos</h3>
      <Tabs defaultValue="by-order" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="by-order"><FileText className="w-4 h-4 mr-2" />Por OP</TabsTrigger>
          <TabsTrigger value="by-product"><Package className="w-4 h-4 mr-2" />Por Producto</TabsTrigger>
          <TabsTrigger value="by-center"><Building className="w-4 h-4 mr-2" />Por Centro de Costo</TabsTrigger>
          <TabsTrigger value="profitability"><DollarSign className="w-4 h-4 mr-2" />Rentabilidad</TabsTrigger>
        </TabsList>
        <TabsContent value="by-order" className="mt-4">
          <ReportByOrder />
        </TabsContent>
        <TabsContent value="by-product" className="mt-4">
          <PlaceholderReport title="Reporte por Producto" />
        </TabsContent>
        <TabsContent value="by-center" className="mt-4">
          <ReportByCostCenter />
        </TabsContent>
        <TabsContent value="profitability" className="mt-4">
          <PlaceholderReport title="Reporte de Rentabilidad" />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default CostReportsView;