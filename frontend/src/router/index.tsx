import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spin } from 'antd';

// Layout
import MainLayout from '@/components/layout/MainLayout';

// Pages
import LoginPage from '@/pages/auth/LoginPage';

// Lazy load pages with loading fallback
const OrganizationPage = lazy(() => import('@/pages/hr/OrganizationPage'));
const EmployeeListPage = lazy(() => import('@/pages/hr/EmployeeListPage'));
const EmployeeDetailPage = lazy(() => import('@/pages/hr/EmployeeDetailPage'));
const EmployeeCreatePage = lazy(() => import('@/pages/hr/EmployeeCreatePage'));
const EmployeeEditPage = lazy(() => import('@/pages/hr/EmployeeEditPage'));
const DataSourceManagementPage = lazy(() => import('@/pages/hr/DataSourceManagementPage'));
const CustomFieldConfigPage = lazy(() => import('@/pages/hr/CustomFieldConfigPage'));
const EmployeeInfoConfigPage = lazy(() => import('@/pages/hr/EmployeeInfoConfigPage'));
const SearchConditionsConfigPage = lazy(() => import('@/pages/hr/SearchConditionsConfigPage'));
const AccountPage = lazy(() => import('@/pages/account/AccountPage'));
const DeviceManagementPage = lazy(() => import('@/pages/punch/DeviceManagementPage'));
const PunchRecordPage = lazy(() => import('@/pages/punch/PunchRecordPage'));
const DeviceGroupPage = lazy(() => import('@/pages/punch/DeviceGroupPage'));
const ShiftPage = lazy(() => import('@/pages/shift/ShiftPage'));
const ShiftEditPage = lazy(() => import('@/pages/shift/ShiftEditPage'));
const ShiftPropertyConfigPage = lazy(() => import('@/pages/shift/ShiftPropertyConfigPage'));
const SchedulePage = lazy(() => import('@/pages/shift/SchedulePage'));
const PunchPairResultPage = lazy(() => import('@/pages/calculate/PunchPairResultPage'));
const WorkHourResultPage = lazy(() => import('@/pages/calculate/WorkHourResultPage'));
const PunchRulePage = lazy(() => import('@/pages/calculate/PunchRulePage'));
const AttendanceCodePage = lazy(() => import('@/pages/calculate/AttendanceCodePage'));
const WorkHourDetailPage = lazy(() => import('@/pages/attendance/WorkHourDetailPage'));
const AllocationPage = lazy(() => import('@/pages/allocation/AllocationPage'));
const AllocationConfigPage = lazy(() => import('@/pages/allocation/AllocationConfigPage'));
const AllocationBasicConfigPage = lazy(() => import('@/pages/allocation/AllocationBasicConfigPage'));
const AllocationCalculatePage = lazy(() => import('@/pages/allocation/AllocationCalculatePage'));
const AllocationResultPage = lazy(() => import('@/pages/allocation/AllocationResultPage'));
const LineMaintenancePage = lazy(() => import('@/pages/allocation/LineMaintenancePage'));
const ProductConfigPage = lazy(() => import('@/pages/allocation/ProductConfigPage'));
const ProductionRecordPage = lazy(() => import('@/pages/allocation/ProductionRecordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SystemPage = lazy(() => import('@/pages/system/SystemPage'));
const RoleManagementPage = lazy(() => import('@/pages/system/RoleManagementPage'));
const SettingsManagementPage = lazy(() => import('@/pages/system/SettingsManagementPage'));

// Loading component
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

// Wrap lazy components with Suspense
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <SuspenseWrapper>
            <DashboardPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'hr',
        children: [
          { index: true, element: <Navigate to="/hr/organizations" replace /> },
          {
            path: 'organizations',
            element: (
              <SuspenseWrapper>
                <OrganizationPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'employees',
            element: (
              <SuspenseWrapper>
                <EmployeeListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'employees/create',
            element: (
              <SuspenseWrapper>
                <EmployeeCreatePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'employees/:id/edit',
            element: (
              <SuspenseWrapper>
                <EmployeeEditPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'employees/:id',
            element: (
              <SuspenseWrapper>
                <EmployeeDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'data-source-management',
            element: (
              <SuspenseWrapper>
                <DataSourceManagementPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'custom-field-config',
            element: (
              <SuspenseWrapper>
                <CustomFieldConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'employee-info-config',
            element: (
              <SuspenseWrapper>
                <EmployeeInfoConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'search-conditions-config',
            element: (
              <SuspenseWrapper>
                <SearchConditionsConfigPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'account',
        element: (
          <SuspenseWrapper>
            <AccountPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'punch',
        children: [
          { index: true, element: <Navigate to="/punch/devices" replace /> },
          {
            path: 'devices',
            element: (
              <SuspenseWrapper>
                <DeviceManagementPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'records',
            element: (
              <SuspenseWrapper>
                <PunchRecordPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'device-groups',
            element: (
              <SuspenseWrapper>
                <DeviceGroupPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'shift',
        children: [
          { index: true, element: <Navigate to="/shift/shifts" replace /> },
          {
            path: 'shifts',
            element: (
              <SuspenseWrapper>
                <ShiftPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'shifts/:id',
            element: (
              <SuspenseWrapper>
                <ShiftEditPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'property-config',
            element: (
              <SuspenseWrapper>
                <ShiftPropertyConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'schedules',
            element: (
              <SuspenseWrapper>
                <SchedulePage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'calculate',
        children: [
          { index: true, element: <Navigate to="/calculate/pairing-results" replace /> },
          {
            path: 'pairing-results',
            element: (
              <SuspenseWrapper>
                <PunchPairResultPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'work-hour-results',
            element: (
              <SuspenseWrapper>
                <WorkHourResultPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'config',
            children: [
              { index: true, element: <Navigate to="/calculate/config/punch-rules" replace /> },
              {
                path: 'punch-rules',
                element: (
                  <SuspenseWrapper>
                    <PunchRulePage />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'attendance-codes',
                element: (
                  <SuspenseWrapper>
                    <AttendanceCodePage />
                  </SuspenseWrapper>
                ),
              },
            ],
          },
        ],
      },
      {
        path: 'attendance',
        children: [
          {
            path: 'workhour-details',
            element: (
              <SuspenseWrapper>
                <WorkHourDetailPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'allocation',
        children: [
          { index: true, element: <Navigate to="/allocation/config" replace /> },
          {
            path: 'config',
            element: (
              <SuspenseWrapper>
                <AllocationConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'product-config',
            element: (
              <SuspenseWrapper>
                <ProductConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'basic-config',
            element: (
              <SuspenseWrapper>
                <AllocationBasicConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'calculate',
            element: (
              <SuspenseWrapper>
                <AllocationCalculatePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'results',
            element: (
              <SuspenseWrapper>
                <AllocationResultPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'line-maintenance',
            element: (
              <SuspenseWrapper>
                <LineMaintenancePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'product-config',
            element: (
              <SuspenseWrapper>
                <ProductConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'production-records',
            element: (
              <SuspenseWrapper>
                <ProductionRecordPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'system',
        children: [
          { index: true, element: <Navigate to="/system/settings" replace /> },
          {
            path: 'settings',
            element: (
              <SuspenseWrapper>
                <SettingsManagementPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'users',
            element: (
              <SuspenseWrapper>
                <SystemPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'roles',
            element: (
              <SuspenseWrapper>
                <RoleManagementPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },
]);

export default router;
