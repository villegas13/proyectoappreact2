import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutGrid, BarChart3, AreaChart } from 'lucide-react';
import ShopFloorInteractiveView from '@/components/shop-floor-control/ShopFloorInteractiveView';
import ShopFloorTableView from '@/components/shop-floor-control/ShopFloorTableView';
import ProductionProgressView from '@/components/shop-floor-control/ProductionProgressView';

const ShopFloorControlModule = () => {
  const { submodule } = useParams();
  const activeTab = submodule || 'interactive';

  const tabs = [
    { id: 'interactive', label: 'Control Interactivo', icon: LayoutGrid, component: <ShopFloorInteractiveView /> },
    { id: 'report', label: 'Reporte de Piso', icon: BarChart3, component: <ShopFloorTableView /> },
    { id: 'progress', label: 'Avance por Proceso', icon: AreaChart, component: <ProductionProgressView /> },
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Control de Piso</h1>
          <p className="text-muted-foreground">Monitorea y gestiona la producción en tiempo real.</p>
        </div>
      </div>

      <Tabs value={activeTab} className="flex flex-col flex-grow">
        <TabsList className="grid w-full grid-cols-3">
          {tabs.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} asChild>
              <Link to={`/shop_floor_control/${tab.id}`} className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Link>
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(tab => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4 flex-grow">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ShopFloorControlModule;