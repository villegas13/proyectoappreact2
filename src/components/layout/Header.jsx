import React from 'react';
import { motion } from 'framer-motion';
import { Menu, X, Sun, Moon, Bell, Search, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = ({ sidebarOpen, toggleSidebar, darkMode, toggleTheme, userName, userRole }) => {
  const { signOut } = useAuth();

  return (
    <header 
      className="sticky top-0 z-30 h-20 flex items-center justify-between px-6 transition-colors duration-300"
      style={{ 
        backgroundColor: darkMode ? 'var(--bg-secondary)' : '#1E88E5', /* Corporate blue for light mode */
        borderBottom: '1px solid var(--border)' 
      }}
    >
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className={darkMode ? "text-text-secondary hover:bg-tertiary" : "text-white hover:bg-blue-700"} /* White text for light mode */
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
        <div className="relative hidden md:block">
          <Search className={darkMode ? "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" : "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/70"} />
          <input
            type="text"
            placeholder="Buscar..."
            className={darkMode ? "pl-10 pr-4 py-2 w-80 rounded-xl border-transparent bg-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition" : "pl-10 pr-4 py-2 w-80 rounded-xl border-transparent bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition text-white placeholder-white/70"}
            style={{ color: darkMode ? 'var(--text-primary)' : 'white' }}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={darkMode ? "text-text-secondary hover:bg-tertiary" : "text-white hover:bg-blue-700"}
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={darkMode ? "text-text-secondary hover:bg-tertiary relative" : "text-white hover:bg-blue-700 relative"}
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-accent-orange rounded-full"></span>
        </Button>

        <div className="h-8 w-px bg-border mx-2"></div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-tertiary">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple flex items-center justify-center">
                <span className="text-white text-sm font-bold">{userName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="hidden md:block text-right">
                <p className="font-semibold text-sm" style={{ color: darkMode ? 'var(--text-primary)' : 'white' }}>{userName}</p>
                <p className="text-xs" style={{ color: darkMode ? 'var(--text-secondary)' : 'white/80' }}>{userRole}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;