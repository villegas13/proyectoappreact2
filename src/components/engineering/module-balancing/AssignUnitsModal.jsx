import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AssignUnitsModal = ({ target, onClose, onAssign }) => {
  const { operation, operatorId } = target;
  const [units, setUnits] = useState(operation.pending_uph || 1);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (target) {
      setUnits(operation.pending_uph || 1);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [target, operation]);

  const handleAssign = () => {
    onAssign(operation, operatorId, units);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  if (!target) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Unidades</DialogTitle>
          <DialogDescription>
            ¿Cuántas unidades por hora de "{operation.name}" quieres asignar?
            Quedan <span className="font-bold">{operation.pending_uph}</span> unidades por asignar.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="units-input">Unidades por Hora</Label>
          <Input
            id="units-input"
            type="number"
            value={units}
            onChange={(e) => setUnits(Math.max(1, Math.min(operation.pending_uph, parseInt(e.target.value) || 1)))}
            max={operation.pending_uph}
            min="1"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleAssign}>Asignar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignUnitsModal;