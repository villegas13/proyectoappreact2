import React from 'react';
import OperatorColumn from './OperatorColumn';

const OperatorsGrid = ({ operators, operatorNames, operatorCalculations, setOperatorNames, handleAssignedUnitsChange, onRemoveOperation }) => {
  return (
    <div className="lg:col-span-3 grid md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-y-auto h-full p-1">
      {Object.keys(operators).map((opId) => (
        <OperatorColumn
          key={opId}
          opId={opId}
          name={operatorNames[opId]}
          operatorData={operators[opId]}
          calculations={operatorCalculations[opId]}
          onNameChange={(id, newName) => setOperatorNames(prev => ({ ...prev, [id]: newName }))}
          onUnitsChange={handleAssignedUnitsChange}
          onRemoveOperation={onRemoveOperation}
        />
      ))}
    </div>
  );
};

export default OperatorsGrid;