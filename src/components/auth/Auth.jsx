import React, { useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, LogIn, Mail } from 'lucide-react';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const { signIn, signUp } = useAuth();

  const handleAuth = async (event) => {
    event.preventDefault();
    setLoading(true);
    if (isLoginView) {
      await signIn(email, password);
    } else {
      await signUp(email, password);
    }
    setLoading(false);
  };
  
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if(newDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute top-4 right-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </Button>
      </div>

      <div className="w-full max-w-md mx-auto overflow-hidden">
        <motion.div
          className="p-8 space-y-8 rounded-2xl card-shadow"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="text-center">
            <img alt="IntegraTextil ERP Logo" className="h-16 mx-auto mb-4" src="https://images.unsplash.com/photo-1691405167344-c3bbc9710ad2" />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {isLoginView ? 'Bienvenido de Nuevo' : 'Crear una Cuenta'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {isLoginView ? 'Ingresa tus credenciales para acceder a tu panel.' : 'Completa los campos para registrarte.'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isLoginView ? 'login' : 'signup'}
              onSubmit={handleAuth}
              className="space-y-6"
              variants={formVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    required
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white" disabled={loading}>
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    {isLoginView ? 'Iniciar Sesión' : 'Registrarse'}
                  </>
                )}
              </Button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isLoginView ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
            <Button
              variant="link"
              onClick={() => setIsLoginView(!isLoginView)}
              className="font-semibold text-blue-500"
            >
              {isLoginView ? 'Regístrate' : 'Inicia Sesión'}
            </Button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;