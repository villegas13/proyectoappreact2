import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Search, Users, UserX, Clock, Percent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/dashboard/StatCard';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const ReportsView = () => {
  const [summaryStats, setSummaryStats] = useState({
    activeEmployees: 0,
    absencesToday: 0,
    monthlyOvertime: 0,
    avgEfficiency: 0,
  });
  const [employeeReports, setEmployeeReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchSummaryData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const startOfMonthDate = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endOfMonthDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      // Active Employees
      const { count: activeEmployees, error: empError } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Activo');
      if (empError) throw empError;

      // Absences Today
      const { data: attendedToday, error: attendedError } = await supabase
        .from('employee_attendance')
        .select('employee_id')
        .eq('attendance_date', today);
      if (attendedError) throw attendedError;
      const attendedIds = attendedToday.map(a => a.employee_id);
      
      const { count: activeAndNotAttended, error: absentError } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Activo')
        .not('id', 'in', `(${attendedIds.join(',')})`);
      if (absentError && attendedIds.length > 0) throw absentError;
      const absencesToday = attendedIds.length === 0 ? activeEmployees : activeAndNotAttended;


      // Monthly Overtime
      const { data: overtimeData, error: overtimeError } = await supabase
        .from('employee_attendance')
        .select('overtime_hours')
        .gte('attendance_date', startOfMonthDate)
        .lte('attendance_date', endOfMonthDate);
      if (overtimeError) throw overtimeError;
      const monthlyOvertime = overtimeData.reduce((acc, cur) => acc + (cur.overtime_hours || 0), 0);

      // Average Efficiency
      const { data: efficiencyData, error: efficiencyError } = await supabase
        .from('employee_production')
        .select('efficiency')
        .gte('production_date', startOfMonthDate)
        .lte('production_date', endOfMonthDate);
      if (efficiencyError) throw efficiencyError;
      const validEfficiencies = efficiencyData.filter(e => e.efficiency !== null);
      const avgEfficiency = validEfficiencies.length > 0
        ? validEfficiencies.reduce((acc, cur) => acc + cur.efficiency, 0) / validEfficiencies.length
        : 0;

      setSummaryStats({ activeEmployees, absencesToday, monthlyOvertime, avgEfficiency });

      // Employee Reports Data
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, full_name, document_id, area, status')
        .order('full_name');
      if (employeesError) throw employeesError;

      const reportPromises = employeesData.map(async (emp) => {
        const { data: empAttendance, error: attErr } = await supabase
          .from('employee_attendance')
          .select('worked_hours')
          .eq('employee_id', emp.id)
          .gte('attendance_date', startOfMonthDate)
          .lte('attendance_date', endOfMonthDate);
        
        const { data: empProduction, error: prodErr } = await supabase
          .from('employee_production')
          .select('efficiency')
          .eq('employee_id', emp.id)
          .gte('production_date', startOfMonthDate)
          .lte('production_date', endOfMonthDate);

        if (attErr || prodErr) return { ...emp, total_hours: 0, avg_efficiency: 0 };

        const total_hours = empAttendance.reduce((acc, cur) => acc + (cur.worked_hours || 0), 0);
        const validProd = empProduction.filter(p => p.efficiency !== null);
        const avg_efficiency = validProd.length > 0
          ? validProd.reduce((acc, cur) => acc + cur.efficiency, 0) / validProd.length
          : 0;
        
        return { ...emp, total_hours, avg_efficiency };
      });

      const reports = await Promise.all(reportPromises);
      setEmployeeReports(reports);
      setFilteredReports(reports);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: `No se pudieron cargar los reportes: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSummaryData();
  }, [fetchSummaryData]);

  useEffect(() => {
    const results = employeeReports.filter(report =>
      report.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.document_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (report.area && report.area.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredReports(results);
  }, [searchTerm, employeeReports]);

  const dashboardCards = [
    { title: 'Empleados Activos', value: summaryStats.activeEmployees, icon: Users, color: 'blue' },
    { title: 'Ausencias Hoy', value: summaryStats.absencesToday, icon: UserX, color: 'yellow' },
    { title: 'Horas Extras (Mes)', value: summaryStats.monthlyOvertime.toFixed(2), icon: Clock, color: 'purple' },
    { title: 'Eficiencia Promedio (Mes)', value: `${summaryStats.avgEfficiency.toFixed(2)}%`, icon: Percent, color: 'green' },
  ];

  const getEfficiencyBadge = (efficiency) => {
    const eff = parseFloat(efficiency);
    if (eff >= 90) return 'bg-green-500';
    if (eff >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((stat, index) => (
          <StatCard key={stat.title} item={stat} index={index} />
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Reporte General de Empleados</h2>
        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, documento, área..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Horas Trabajadas (Mes)</TableHead>
                <TableHead>Eficiencia Promedio (Mes)</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Cargando reportes...</TableCell></TableRow>
              ) : filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.full_name}</TableCell>
                    <TableCell>{report.document_id}</TableCell>
                    <TableCell>{report.area}</TableCell>
                    <TableCell>{report.total_hours.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getEfficiencyBadge(report.avg_efficiency)}>
                        {`${report.avg_efficiency.toFixed(2)}%`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={report.status === 'Activo' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                        {report.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center">No se encontraron empleados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  );
};

export default ReportsView;