import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';

export const MaterialsTab = ({ materials, setMaterials, allMaterials, isReadOnly }) => {
    const materialOptions = allMaterials.map(m => ({
        value: m.id,
        label: `${m.name} (${m.reference}) - Stock: ${m.current_stock || 0}`,
    }));

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-semibold text-lg">Materiales y Consumos</h4>
                {!isReadOnly && (
                  <Button type="button" size="sm" onClick={() => setMaterials([...materials, { material_id: '', consumption_per_unit: 0, unit_of_measure: '', cost: 0 }])}>
                      <PlusCircle className="h-4 w-4 mr-2" />Añadir Material
                  </Button>
                )}
            </div>
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-2/5">Material</TableHead>
                            <TableHead>Consumo</TableHead>
                            <TableHead>U.M.</TableHead>
                            {!isReadOnly && <TableHead className="text-right">Acciones</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.length > 0 ? materials.map((mat, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Combobox
                                        items={materialOptions}
                                        value={mat.material_id}
                                        onValueChange={val => {
                                            const selectedMat = allMaterials.find(m => m.id === val);
                                            const newMaterials = [...materials];
                                            newMaterials[index].material_id = val;
                                            newMaterials[index].unit_of_measure = selectedMat?.unit_of_measure || '';
                                            newMaterials[index].cost = selectedMat?.standard_cost || 0;
                                            setMaterials(newMaterials);
                                        }}
                                        placeholder="Buscar material..."
                                        searchPlaceholder="Buscar por nombre o ref..."
                                        noResultsText="No se encontraron materiales."
                                        disabled={isReadOnly}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number"
                                        value={mat.consumption_per_unit} 
                                        onChange={e => {
                                            const newMaterials = [...materials];
                                            newMaterials[index].consumption_per_unit = parseFloat(e.target.value) || 0;
                                            setMaterials(newMaterials);
                                        }}
                                        className="max-w-[120px]"
                                        placeholder="0.00"
                                        disabled={isReadOnly}
                                    />
                                </TableCell>
                                <TableCell className="text-muted-foreground">{mat.unit_of_measure}</TableCell>
                                {!isReadOnly && (
                                  <TableCell className="text-right">
                                      <Button type="button" variant="ghost" size="icon" onClick={() => setMaterials(materials.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-600">
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </TableCell>
                                )}
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={isReadOnly ? 3 : 4} className="h-24 text-center">
                                    {isReadOnly ? "No hay materiales asignados." : "Añade materiales para esta ficha técnica."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};