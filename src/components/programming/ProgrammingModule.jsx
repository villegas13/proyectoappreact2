import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SlidersHorizontal, GanttChartSquare, Factory, Clock } from 'lucide-react';
import GanttChart from '@/components/programming/GanttChart';
import WorkShifts from '@/components/programming/WorkShifts';
import ProcessesStations from '@/components/programming/ProcessesStations';

const ProgrammingModule = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
          Programación de Producción
        </h1>
        <p className="text-md mt-1" style={{ color: 'var(--text-secondary)' }}>
          Asigna y visualiza la carga de trabajo de tus órdenes de producción.
        </p>
      </div>

      <Tabs defaultValue="gantt" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gantt"><GanttChartSquare className="w-4 h-4 mr-2" />Diagrama de Gantt</TabsTrigger>
          <TabsTrigger value="processes"><Factory className="w-4 h-4 mr-2" />Procesos</TabsTrigger>
          <TabsTrigger value="shifts"><Clock className="w-4 h-4 mr-2" />Turnos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="gantt">
          <GanttChart />
        </TabsContent>

        <TabsContent value="processes">
          <ProcessesStations />
        </TabsContent>
        
        <TabsContent value="shifts">
          <WorkShifts />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ProgrammingModule;