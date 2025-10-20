import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2 } from 'lucide-react';

export const ProcessesTab = ({ processes, setProcesses, isReadOnly }) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-lg">Procesos de Confección</h4>
                {!isReadOnly && (
                    <Button type="button" size="sm" onClick={() => setProcesses([...processes, { process_name: '', description: '', step_by_step: '' }])}>
                        <PlusCircle className="h-4 w-4 mr-2" />Añadir Proceso
                    </Button>
                )}
            </div>
            {processes.length > 0 ? processes.map((proc, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex justify-between items-center">
                        <h5 className="font-semibold">Proceso #{index + 1}</h5>
                        {!isReadOnly && (
                            <Button type="button" variant="ghost" size="icon" onClick={() => setProcesses(processes.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Input
                            placeholder="Nombre del proceso (ej. Corte, Ensamble, Acabado)"
                            value={proc.process_name}
                            onChange={e => {
                                const newProcs = [...processes];
                                newProcs[index].process_name = e.target.value;
                                setProcesses(newProcs);
                            }}
                            disabled={isReadOnly}
                        />
                        <Textarea
                            placeholder="Descripción detallada del proceso"
                            value={proc.description}
                            onChange={e => {
                                const newProcs = [...processes];
                                newProcs[index].description = e.target.value;
                                setProcesses(newProcs);
                            }}
                            disabled={isReadOnly}
                        />
                        <Textarea
                            placeholder="Paso a paso (opcional)"
                            value={proc.step_by_step}
                            onChange={e => {
                                const newProcs = [...processes];
                                newProcs[index].step_by_step = e.target.value;
                                setProcesses(newProcs);
                            }}
                            disabled={isReadOnly}
                        />
                    </div>
                </div>
            )) : (
                <div className="h-40 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--border)' }}>
                    {isReadOnly ? "No hay procesos definidos." : "Añade los procesos de confección para esta prenda."}
                </div>
            )}
        </div>
    );
};