import React from 'react';
import { useRouteError, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorPage = () => {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center" style={{backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)'}}>
      <AlertTriangle className="w-24 h-24 text-orange-400 mb-6" />
      <h1 className="text-4xl font-extrabold mb-2">¡Ups! Algo salió mal.</h1>
      <p className="text-lg mb-6 max-w-md" style={{color: 'var(--text-secondary)'}}>
        ⚠️ Error al cargar el módulo. Intenta refrescar o comunícate con soporte.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refrescar Página
        </Button>
        <Button asChild variant="outline">
          <Link to="/dashboard">Volver al Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default ErrorPage;