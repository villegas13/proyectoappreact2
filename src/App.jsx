import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Auth from '@/components/auth/Auth';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { Toaster } from '@/components/ui/toaster';
import { Tooltip } from 'react-tooltip';
import { modules } from '@/data/modules';

function App() {
  const { session, user, profile, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const location = useLocation();
  
  const activeModule = useMemo(() => location.pathname.split('/')[1] || 'dashboard', [location.pathname]);

  const currentUser = useMemo(() => ({
    role: profile?.role || 'Usuario',
    name: profile?.first_name || user?.email?.split('@')[0] || 'Usuario'
  }), [profile, user]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    
    if(darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleTheme = () => setDarkMode(!darkMode);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p style={{ color: 'var(--text-primary)' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <>
      <Helmet>
        <title>Integra Textil ERP</title>
        <meta name="description" content="Sistema ERP completo para la industria textil con módulos de producción, inventarios, costos y más." />
      </Helmet>

      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Sidebar
          sidebarOpen={sidebarOpen}
          modules={modules}
          activeModule={activeModule}
          currentUser={currentUser}
        />
        
        <div 
          className="flex-1 transition-all duration-300 flex flex-col"
          style={{ marginLeft: sidebarOpen ? 240 : 80 }}
        >
          <Header
            sidebarOpen={sidebarOpen}
            toggleSidebar={toggleSidebar}
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            userName={currentUser.name}
            userRole={currentUser.role}
          />
          
          <main className="p-6 flex-grow">
            <Outlet />
          </main>
        </div>

        <Toaster />
        <Tooltip id="gantt-tooltip" />
      </div>
    </>
  );
}

export default App;