import React from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ProductionManagerDashboard from '@/components/dashboard/ProductionManagerDashboard';
import ManagementDashboard from '@/components/dashboard/ManagementDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Factory } from 'lucide-react';

const Dashboard = () => {
  const { user, profile } = useAuth();
  const userName = profile?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const userRole = profile?.role || 'Usuario';

  const renderDashboardByRole = () => {
    switch (userRole) {
      case 'Jefe de Produccion':
        return <ProductionManagerDashboard userName={userName} />;
      case 'Gerencia':
        return <ManagementDashboard userName={userName} />;
      case 'Administrador':
      case 'SuperAdministrador':
        return (
          <Tabs defaultValue="management" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="management" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Gerencia
              </TabsTrigger>
              <TabsTrigger value="production" className="flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Producción
              </TabsTrigger>
            </TabsList>
            <TabsContent value="management" className="mt-6">
              <ManagementDashboard userName={userName} />
            </TabsContent>
            <TabsContent value="production" className="mt-6">
              <ProductionManagerDashboard userName={userName} />
            </TabsContent>
          </Tabs>
        );
      default:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
              ¡Bienvenido, {userName}!
            </h2>
            <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
              Selecciona un módulo para comenzar a trabajar.
            </p>
          </div>
        );
    }
  };

  return (
    <>
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 uppercase">
          INTEGRATEXTIL ERP
        </h1>
      </div>
      {renderDashboardByRole()}
    </>
  );
};

export default Dashboard;