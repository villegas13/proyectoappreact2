import React from 'react';
import { useParams, Navigate, NavLink } from 'react-router-dom';
import { User, ClipboardList, BarChart2 } from 'lucide-react';
import EmployeesView from './employees/EmployeesView';
import AttendanceView from './attendance/AttendanceView';
import ProductivityView from './productivity/ProductivityView';

const submodules = [
  { name: 'Empleados', path: 'employees', icon: User, component: EmployeesView },
  { name: 'Asistencia', path: 'attendance', icon: ClipboardList, component: AttendanceView },
  { name: 'Productividad', path: 'productivity', icon: BarChart2, component: ProductivityView },
];

const PersonnelModule = () => {
  const { submodule } = useParams();

  const activeSubmodule = submodules.find(m => m.path === submodule);

  if (!submodule || !activeSubmodule) {
    return <Navigate to={`/personnel/${submodules[0].path}`} replace />;
  }
  
  const ActiveComponent = activeSubmodule.component;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--text-h1)' }}>Gestión de Personal</h1>
        <p className="text-muted-foreground">Administra empleados, asistencia y productividad.</p>
      </div>

      <div className="border-b mb-6">
        <nav className="flex space-x-4 -mb-px">
          {submodules.map((mod) => (
            <NavLink
              key={mod.path}
              to={`/personnel/${mod.path}`}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 border-b-2 text-sm font-medium transition-colors duration-200 ease-in-out
                ${
                  isActive
                    ? 'border-accent-purple text-accent-purple'
                    : 'border-transparent text-muted-foreground hover:text-primary hover:border-gray-300'
                }`
              }
            >
              <mod.icon className="mr-2 h-5 w-5" />
              {mod.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex-grow">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default PersonnelModule;