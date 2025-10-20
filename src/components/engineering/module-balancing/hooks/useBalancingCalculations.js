import { useMemo } from 'react';

export const useBalancingCalculations = (dndState, numberOfPeople, operationSheet, operatorNames) => {
  const operatorCalculations = useMemo(() => {
    const calcs = {};
    if (!dndState.operators) return calcs;
    
    for (const operatorId in dndState.operators) {
      const ops = dndState.operators[operatorId];
      // Note: The original calculation based on assigned UPH seems incorrect for occupancy.
      // Occupancy should be based on the total standard time of tasks assigned to an operator.
      // Re-evaluating this logic. A simpler approach is to sum the SAM of assigned operation instances.
      // But since we can split ops, we need a way to portion the SAM.
      // Let's calculate based on the proportion of UPH assigned.
      
      const occupiedMinutes = ops.reduce((sum, op) => {
          const originalOp = dndState.unassigned.find(uo => uo.id === op.id);
          if (!originalOp || !originalOp.total_uph || originalOp.total_uph === 0) return sum;
          
          const proportion = op.assigned_units_per_hour / originalOp.total_uph;
          const proportionalSam = (parseFloat(op.sam) || 0) * proportion;
          return sum + proportionalSam;
      }, 0);
      
      // The total available time for an operator is more complex, it depends on Takt Time.
      // Let's use a simpler 60-minute window for occupancy percentage.
      const total_sam_all = dndState.unassigned.reduce((sum, op) => sum + (parseFloat(op.sam) || 0), 0);
      const takt_time = total_sam_all > 0 && numberOfPeople > 0 ? total_sam_all / numberOfPeople : 0;
      
      const occupancyPercentage = takt_time > 0 ? (occupiedMinutes / takt_time) * 100 : 0;
      
      calcs[operatorId] = { occupiedMinutes, occupancyPercentage };
    }
    return calcs;
  }, [dndState.operators, dndState.unassigned, numberOfPeople]);

  const summary = useMemo(() => {
    if (!operationSheet) return { totalSAM: 0, unitsPerHour: 0, taktTime: 0, requiredMachines: 0, summaryStats: {} };
    
    const allOps = dndState.unassigned;
    const total_sam = allOps.reduce((sum, op) => sum + (parseFloat(op.sam) || 0), 0);
    const units_per_hour = numberOfPeople > 0 && total_sam > 0 ? Math.floor((60 * numberOfPeople) / total_sam) : 0;
    const takt_time = total_sam > 0 && numberOfPeople > 0 ? total_sam / numberOfPeople : 0;
    const required_machines = takt_time > 0 ? allOps.reduce((sum, op) => sum + ((parseFloat(op.sam) || 0) / takt_time), 0) : 0;

    const stats = {
      average_occupancy: 0,
      most_loaded: { name: 'N/A', percentage: 0 },
      least_loaded: { name: 'N/A', percentage: 0 },
    };
    const occupancies = Object.keys(dndState.operators).map(opId => operatorCalculations[opId]?.occupancyPercentage || 0);
    
    if (occupancies.length > 0) {
      stats.average_occupancy = occupancies.reduce((a, b) => a + b, 0) / occupancies.length;
      
      const max = Math.max(...occupancies);
      const min = Math.min(...occupancies);
      
      const mostLoadedId = Object.keys(operatorCalculations).find(id => operatorCalculations[id].occupancyPercentage === max);
      const leastLoadedId = Object.keys(operatorCalculations).find(id => operatorCalculations[id].occupancyPercentage === min);

      stats.most_loaded = { name: operatorNames[mostLoadedId] || 'Operario', percentage: max };
      stats.least_loaded = { name: operatorNames[leastLoadedId] || 'Operario', percentage: min };
    }
    
    return { totalSAM: total_sam, unitsPerHour: units_per_hour, taktTime: takt_time, requiredMachines: required_machines, summaryStats: stats };
  }, [dndState, numberOfPeople, operationSheet, operatorCalculations, operatorNames]);

  return { operatorCalculations, ...summary };
};