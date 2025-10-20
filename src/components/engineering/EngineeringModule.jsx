import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sliders, ListChecks, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import CreateOperation from '@/components/engineering/CreateOperation';
import ModuleBalancing from '@/components/engineering/ModuleBalancing';
import OperationSheetView from '@/components/engineering/OperationSheetView';

const PlaceholderContent = ({ title }) => {
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: `Módulo ${title}`,
      description: "🚧 Esta función no está implementada aún—¡pero no te preocupes! ¡Puedes solicitarla en tu próximo prompt! 🚀",
    });
  }, [title, toast]);

  return (
    <div className="p-6 rounded-xl card-shadow flex flex-col items-center justify-center h-96" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <ListChecks className="w-16 h-16 mb-4" style={{ color: 'var(--text-muted)' }} />
      <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="mt-2 text-center" style={{ color: 'var(--text-secondary)' }}>
        Esta sección está en desarrollo. ¡Vuelve pronto!
      </p>
    </div>
  );
};


const EngineeringModule = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Módulo de Ingeniería
        </h1>
        <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
          Define operaciones, tiempos estándar y balancea tus módulos de producción.
        </p>
      </div>

      <Tabs defaultValue="create-operation" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create-operation"><Sliders className="w-4 h-4 mr-2" />Crear Operación</TabsTrigger>
          <TabsTrigger value="operation-sheet"><ListChecks className="w-4 h-4 mr-2" />Hoja de Operaciones</TabsTrigger>
          <TabsTrigger value="module-balancing"><Users className="w-4 h-4 mr-2" />Balanceo de Módulo</TabsTrigger>
        </TabsList>

        <TabsContent value="create-operation">
            <CreateOperation />
        </TabsContent>
        <TabsContent value="operation-sheet">
            <OperationSheetView />
        </TabsContent>
        <TabsContent value="module-balancing">
            <ModuleBalancing />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default EngineeringModule;