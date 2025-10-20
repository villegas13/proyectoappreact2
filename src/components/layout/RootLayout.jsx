import React from 'react';
import { useNavigation } from 'react-router-dom';
import App from '@/App';

const RootLayout = () => {
  const navigation = useNavigation();

  return (
    <>
      {navigation.state === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Cargando...</p>
          </div>
        </div>
      )}
      <App />
    </>
  );
};

export default RootLayout;