import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const Sidebar = ({ 
  sidebarOpen,
  modules,
  currentUser
}) => {
  const { toast } = useToast();
  const location = useLocation();
  const activeModule = location.pathname.split('/')[1] || 'dashboard';

  const handleModuleClick = (e, module) => {
    if (module.roles && !module.roles.includes(currentUser.role)) {
      e.preventDefault();
      toast({
        title: "Acceso Restringido",
        description: "No tienes permiso para acceder a este módulo.",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 80 }}
      className="fixed left-0 top-0 h-full z-40 sidebar-transition"
      style={{ backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border)' }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center h-20 px-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <motion.div 
            className="logo-container"
            animate={{
              width: sidebarOpen ? '100%' : '48px',
              height: sidebarOpen ? 'auto' : '48px',
              transition: { duration: 0.3 }
            }}
          >
            <img 
              src="https://horizons-cdn.hostinger.com/a54a38cd-63e0-4434-8f83-e0dc129c24f1/a050505d3ad792e3f08c7e4ce6cd7446.jpg" 
              alt="IntegraTextil ERP Logo"
              className="object-contain h-full w-full"
            />
          </motion.div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto scrollbar-hide">
          {modules.map((module) => {
            const Icon = module.icon;
            const isActive = activeModule === module.id;
            
            if (module.roles && !module.roles.includes(currentUser.role)) {
              return null;
            }

            return (
              <Link
                to={`/${module.id}`}
                key={module.id}
                onClick={(e) => handleModuleClick(e, module)}
              >
                <motion.div
                  className={`w-full flex items-center justify-start py-2.5 px-3 rounded-xl transition-all duration-300 relative group
                    ${isActive ? 'text-white' : 'text-text-secondary hover:text-text-primary'}`
                  }
                  style={isActive ? { backgroundColor: 'var(--accent-blue)' } : {}}
                >
                  <div className="flex items-center space-x-3 z-10">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.2 }}
                          className="font-semibold text-sm whitespace-nowrap"
                        >
                          {module.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <AnimatePresence>
                    {!isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: 'linear-gradient(90deg, var(--accent-orange), var(--accent-purple), var(--accent-blue), var(--accent-green))',
                          backgroundSize: '200% 200%',
                        }}
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 0.15 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <AnimatePresence>
              {sidebarOpen && (
                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-center text-xs"
                    style={{ color: 'var(--text-secondary)'}}
                 >
                    <p>&copy; {new Date().getFullYear()} Integra Textil</p>
                    <p>v1.2.0</p>
                 </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;