import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import PunchRecordsPage from '@/pages/PunchRecordsPage';
import WorkHoursPage from '@/pages/WorkHoursPage';
import AttendancePage from '@/pages/AttendancePage';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('mobile_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute><HomePage /></ProtectedRoute>,
  },
  {
    path: '/punch-records',
    element: <ProtectedRoute><PunchRecordsPage /></ProtectedRoute>,
  },
  {
    path: '/work-hours',
    element: <ProtectedRoute><WorkHoursPage /></ProtectedRoute>,
  },
  {
    path: '/attendance',
    element: <ProtectedRoute><AttendancePage /></ProtectedRoute>,
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;
