import React from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const CostsTab = ({ materials, setMaterials, allMaterials, totalCost, isReadOnly }) => {
    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-lg">Costo de Materiales</h4>
            <div className="rounded-lg border overflow-hidden mt-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead>Consumo</TableHead>
                            <TableHead>Costo Unitario</TableHead>
                            <TableHead className="text-right">Costo Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.length > 0 ? materials.map((mat, index) => {
                            const materialInfo = allMaterials.find(m => m.id === mat.material_id);
                            return (
                                <TableRow key={index}>
                                    <TableCell>{materialInfo?.name || 'N/A'}</TableCell>
                                    <TableCell>{mat.consumption_per_unit} {mat.unit_of_measure}</TableCell>
                                    <TableCell>
                                        <Input 
                                            type="number" 
                                            value={mat.cost} 
                                            onChange={e => {
                                                const newMaterials = [...materials];
                                                newMaterials[index].cost = parseFloat(e.target.value) || 0;
                                                setMaterials(newMaterials);
                                            }}
                                            className="max-w-[120px]"
                                            disabled={isReadOnly}
                                            prefix="$"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-medium">${((mat.cost || 0) * (mat.consumption_per_unit || 0)).toFixed(2)}</TableCell>
                                </TableRow>
                            )
                        }) : (
                            <TableRow>
                                <TableCell colSpan="4" className="h-24 text-center">
                                    No hay materiales para calcular costos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-right font-bold text-xl mt-4">Costo Total de Materiales: ${totalCost.toFixed(2)}</div>
        </div>
    );
};