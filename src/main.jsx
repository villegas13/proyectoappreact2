import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';
import RootLayout from '@/components/layout/RootLayout';
import Dashboard from '@/components/dashboard/Dashboard';
import PlanningModule from '@/components/planning/PlanningModule';
import ProgrammingModule from '@/components/programming/ProgrammingModule';
import EngineeringModule from '@/components/engineering/EngineeringModule';
import InventoryModule from '@/components/inventory/InventoryModule';
import PersonnelModule from '@/components/personnel/PersonnelModule';
import CostsModule from '@/components/costs/CostsModule';
import ShopFloorControlModule from '@/components/shop-floor-control/ShopFloorControlModule';
import UsersModule from '@/components/users/UsersModule';
import ErrorPage from '@/components/layout/ErrorPage';
import 'react-beautiful-dnd';

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "planning", element: <PlanningModule /> },
      { path: "planning/:submodule", element: <PlanningModule /> },
      { path: "programming", element: <ProgrammingModule /> },
      { path: "programming/:submodule", element: <ProgrammingModule /> },
      { path: "engineering", element: <EngineeringModule /> },
      { path: "engineering/:submodule", element: <EngineeringModule /> },
      { path: "inventory", element: <InventoryModule /> },
      { path: "inventory/:submodule", element: <InventoryModule /> },
      { path: "personnel", element: <PersonnelModule /> },
      { path: "personnel/:submodule", element: <PersonnelModule /> },
      { path: "costs", element: <CostsModule /> },
      { path: "costs/:submodule", element: <CostsModule /> },
      { path: "shop_floor_control", element: <ShopFloorControlModule /> },
      { path: "shop_floor_control/:submodule", element: <ShopFloorControlModule /> },
      { path: "users", element: <UsersModule /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> }
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router}>
        <App />
      </RouterProvider>
    </AuthProvider>
  </React.StrictMode>
);