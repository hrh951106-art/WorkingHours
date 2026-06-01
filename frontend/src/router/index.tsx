import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
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
const UnifiedSearchConditionConfigPage = lazy(() => import('@/pages/hr/UnifiedSearchConditionConfigPage'));
const AccountPage = lazy(() => import('@/pages/account/AccountPage'));
const DeviceManagementPage = lazy(() => import('@/pages/punch/DeviceManagementPage'));
const PunchRecordPage = lazy(() => import('@/pages/punch/PunchRecordPage'));
const DeviceGroupPage = lazy(() => import('@/pages/punch/DeviceGroupPage'));
const ShiftPage = lazy(() => import('@/pages/shift/ShiftPage'));
const ShiftEditPage = lazy(() => import('@/pages/shift/ShiftEditPage'));
const ShiftPropertyConfigPage = lazy(() => import('@/pages/shift/ShiftPropertyConfigPage'));
const SchedulePage = lazy(() => import('@/pages/shift/SchedulePage'));
const CalculateResultPage = lazy(() => import('@/pages/calculate/CalculateResultPage'));
const PunchPairResultPage = lazy(() => import('@/pages/calculate/PunchPairResultPage'));
const WorkHourResultPage = lazy(() => import('@/pages/calculate/WorkHourResultPage'));
const PunchRulesPage = lazy(() => import('@/pages/calculate/PunchRulesPage'));
const AttendanceCodePage = lazy(() => import('@/pages/calculate/AttendanceCodePage'));
const AmountPolicyPage = lazy(() => import('@/pages/calculate/AmountPolicyPage'));
const AttendancePunchCollectionPage = lazy(() => import('@/pages/calculate/AttendancePunchCollectionPage'));
const WorkHourDetailPage = lazy(() => import('@/pages/attendance/WorkHourDetailPage'));
const AttendanceDashboardPage = lazy(() => import('@/pages/attendance/AttendanceDashboardPage'));
const AttendanceCardPage = lazy(() => import('@/pages/attendance/AttendanceCardPage'));
const AllocationPage = lazy(() => import('@/pages/allocation/AllocationPage'));
const AllocationConfigPage = lazy(() => import('@/pages/allocation/AllocationConfigPage'));
const AllocationBasicConfigPage = lazy(() => import('@/pages/allocation/AllocationBasicConfigPage'));
const WorkHourBasicConfigPage = lazy(() => import('@/pages/allocation/WorkHourBasicConfigPage'));
const ProductStandardHoursConfigPage = lazy(() => import('@/pages/allocation/ProductStandardHoursConfigPage'));
const AllocationCalculatePage = lazy(() => import('@/pages/allocation/AllocationCalculatePage'));
const AllocationResultPage = lazy(() => import('@/pages/allocation/AllocationResultPage'));
const LineMaintenancePage = lazy(() => import('@/pages/allocation/LineMaintenancePage'));
const ProductConfigPage = lazy(() => import('@/pages/allocation/ProductConfigPage'));
const ProductionRecordPage = lazy(() => import('@/pages/allocation/ProductionRecordPage'));
const NewProductionRecordPage = lazy(() => import('@/pages/allocation/NewProductionRecordPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const SystemPage = lazy(() => import('@/pages/system/SystemPage'));
const RoleManagementPage = lazy(() => import('@/pages/system/RoleManagementPage'));
const SettingsManagementPage = lazy(() => import('@/pages/system/SettingsManagementPage'));
const WorkflowDefinitionListPage = lazy(() => import('@/pages/workflow/WorkflowDefinitionListPage'));
const WorkflowDesignerPage = lazy(() => import('@/pages/workflow/WorkflowDesignerPage'));
const WorkflowInstanceListPage = lazy(() => import('@/pages/workflow/WorkflowInstanceListPage'));
const FormWorkflowConfigPage = lazy(() => import('@/pages/workflow/FormWorkflowConfigPage'));
const WorkflowParticipantListPage = lazy(() => import('@/pages/workflow/WorkflowParticipantListPage'));
const WorkflowParticipantFormPage = lazy(() => import('@/pages/workflow/WorkflowParticipantFormPage'));
const FormWorkflowConfigDetailPage = lazy(() => import('@/pages/workflow/FormWorkflowConfigDetailPage'));
const PendingApprovalPage = lazy(() => import('@/pages/approval/PendingApprovalPage'));
const MyApplicationsPage = lazy(() => import('@/pages/approval/MyApplicationsPage'));
const SupportRequestListPage = lazy(() => import('@/pages/support/SupportRequestListPage'));
const SupportRequestCreatePage = lazy(() => import('@/pages/support/SupportRequestCreatePage'));
const SupportRequestDetailPage = lazy(() => import('@/pages/support/SupportRequestDetailPage'));
const ProductionReportListPage = lazy(() => import('@/pages/report/ProductionReportListPage'));
const ProductionReportCreatePage = lazy(() => import('@/pages/report/ProductionReportCreatePage'));
const LaborHourReportListPage = lazy(() => import('@/pages/labor-hour-report/LaborHourReportListPage'));
const LaborHourReportCreatePage = lazy(() => import('@/pages/labor-hour-report/LaborHourReportCreatePage'));
const LaborHourReportDetailPage = lazy(() => import('@/pages/labor-hour-report/LaborHourReportDetailPage'));
const DataSourceManagePage = lazy(() => import('@/pages/bi-report/datasource/DataSourceManagePage'));
const DataModelListPage = lazy(() => import('@/pages/bi-report/model/DataModelListPage'));
const DataModelDetailPage = lazy(() => import('@/pages/bi-report/model/DataModelDetailPage'));
const DataModelEditPage = lazy(() => import('@/pages/bi-report/model/DataModelEditPage'));
const CompositeModelEditPage = lazy(() => import('@/pages/bi-report/model/CompositeModelEditPage'));
const DataProcessEditorPage = lazy(() => import('@/pages/bi-report/model/DataProcessEditorPage'));
const BiReportListPage = lazy(() => import('@/pages/bi-report/report/BiReportListPage'));
const BiReportDesignerPage = lazy(() => import('@/pages/bi-report/report/BiReportDesignerPage'));
const BiReportViewPage = lazy(() => import('@/pages/bi-report/report/BiReportViewPage'));
const AttendanceCodeDefinitionPage = lazy(() => import('@/pages/calculate/AttendanceCodeDefinitionPage'));
const AttendanceRuleGroupPage = lazy(() => import('@/pages/calculate/AttendanceRuleGroupPage'));

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
    path: '/embed',
    element: (
      <ProtectedRoute>
        <SuspenseWrapper>
          <Outlet />
        </SuspenseWrapper>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/embed/hr/data-source-management" replace /> },
      {
        path: 'hr',
        children: [
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
          {
            path: 'unified-search-condition-configs',
            element: (
              <SuspenseWrapper>
                <UnifiedSearchConditionConfigPage />
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
          {
            path: 'results',
            element: (
              <SuspenseWrapper>
                <CalculateResultPage />
              </SuspenseWrapper>
            ),
          },
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
            path: 'config/punch-rules',
            element: (
              <SuspenseWrapper>
                <PunchRulesPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'config/attendance-codes',
            element: (
              <SuspenseWrapper>
                <AttendanceCodePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'config/amount-policies',
            element: (
              <SuspenseWrapper>
                <AmountPolicyPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'config/attendance-rule-groups',
            element: (
              <SuspenseWrapper>
                <AttendanceRuleGroupPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'attendance-code-definition',
            element: (
              <SuspenseWrapper>
                <AttendanceCodeDefinitionPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'attendance',
        children: [
          {
            path: 'dashboard',
            element: (
              <SuspenseWrapper>
                <AttendanceDashboardPage />
              </SuspenseWrapper>
            ),
          },
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
          {
            path: 'line-maintenance',
            element: (
              <SuspenseWrapper>
                <LineMaintenancePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'new-production-records',
            element: (
              <SuspenseWrapper>
                <NewProductionRecordPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'config',
            element: (
              <SuspenseWrapper>
                <AllocationConfigPage />
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
            path: 'basic-config',
            element: (
              <SuspenseWrapper>
                <AllocationBasicConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'work-hour-basic-config',
            element: (
              <SuspenseWrapper>
                <WorkHourBasicConfigPage />
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
            path: 'product-standard-hours-config',
            element: (
              <SuspenseWrapper>
                <ProductStandardHoursConfigPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'approval',
        children: [
          {
            path: 'pending',
            element: (
              <SuspenseWrapper>
                <PendingApprovalPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'my-applications',
            element: (
              <SuspenseWrapper>
                <MyApplicationsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'support',
        children: [
          {
            path: 'list',
            element: (
              <SuspenseWrapper>
                <SupportRequestListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'create',
            element: (
              <SuspenseWrapper>
                <SupportRequestCreatePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'detail/:id',
            element: (
              <SuspenseWrapper>
                <SupportRequestDetailPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'report',
        children: [
          {
            path: 'list',
            element: (
              <SuspenseWrapper>
                <ProductionReportListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'create',
            element: (
              <SuspenseWrapper>
                <ProductionReportCreatePage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'labor-hour-report',
        children: [
          {
            path: 'list',
            element: (
              <SuspenseWrapper>
                <LaborHourReportListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'create',
            element: (
              <SuspenseWrapper>
                <LaborHourReportCreatePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ':id',
            element: (
              <SuspenseWrapper>
                <LaborHourReportDetailPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'system',
        children: [
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
      {
        path: 'workflow',
        children: [
          {
            path: 'form-config',
            element: (
              <SuspenseWrapper>
                <FormWorkflowConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'form-config/:formKey',
            element: (
              <SuspenseWrapper>
                <FormWorkflowConfigDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'definitions',
            element: (
              <SuspenseWrapper>
                <WorkflowDefinitionListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'designer',
            element: (
              <SuspenseWrapper>
                <WorkflowDesignerPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'instances',
            element: (
              <SuspenseWrapper>
                <WorkflowInstanceListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'participants',
            element: (
              <SuspenseWrapper>
                <WorkflowParticipantListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'participants/create',
            element: (
              <SuspenseWrapper>
                <WorkflowParticipantFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'participants/:id/edit',
            element: (
              <SuspenseWrapper>
                <WorkflowParticipantFormPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
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
          {
            path: 'unified-search-condition-configs',
            element: (
              <SuspenseWrapper>
                <UnifiedSearchConditionConfigPage />
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
          { index: true, element: <Navigate to="/calculate/results" replace /> },
          {
            path: 'results',
            element: (
              <SuspenseWrapper>
                <CalculateResultPage />
              </SuspenseWrapper>
            ),
          },
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
            path: 'attendance-punch-collection',
            element: (
              <SuspenseWrapper>
                <AttendancePunchCollectionPage />
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
                    <PunchRulesPage />
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
              {
                path: 'amount-policies',
                element: (
                  <SuspenseWrapper>
                    <AmountPolicyPage />
                  </SuspenseWrapper>
                ),
              },
              {
                path: 'attendance-rule-groups',
                element: (
                  <SuspenseWrapper>
                    <AttendanceRuleGroupPage />
                  </SuspenseWrapper>
                ),
              },
            ],
          },
          {
            path: 'attendance-code-definition',
            element: (
              <SuspenseWrapper>
                <AttendanceCodeDefinitionPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'attendance',
        children: [
          {
            path: 'dashboard',
            element: (
              <SuspenseWrapper>
                <AttendanceDashboardPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'workhour-details',
            element: (
              <SuspenseWrapper>
                <WorkHourDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'attendance-card',
            element: (
              <SuspenseWrapper>
                <AttendanceCardPage />
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
          {
            path: 'new-production-records',
            element: (
              <SuspenseWrapper>
                <NewProductionRecordPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'attendance-code-definition',
            element: (
              <SuspenseWrapper>
                <AttendanceCodeDefinitionPage />
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
      {
        path: 'workflow',
        children: [
          { index: true, element: <Navigate to="/workflow/form-config" replace /> },
          {
            path: 'form-config',
            element: (
              <SuspenseWrapper>
                <FormWorkflowConfigPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'definitions',
            element: (
              <SuspenseWrapper>
                <WorkflowDefinitionListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'instances',
            element: (
              <SuspenseWrapper>
                <WorkflowInstanceListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'participants',
            element: (
              <SuspenseWrapper>
                <WorkflowParticipantListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'participants/create',
            element: (
              <SuspenseWrapper>
                <WorkflowParticipantFormPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'participants/:id/edit',
            element: (
              <SuspenseWrapper>
                <WorkflowParticipantFormPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'approval',
        children: [
          { index: true, element: <Navigate to="/approval/pending" replace /> },
          {
            path: 'pending',
            element: (
              <SuspenseWrapper>
                <PendingApprovalPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'my-applications',
            element: (
              <SuspenseWrapper>
                <MyApplicationsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'support',
        children: [
          { index: true, element: <Navigate to="/support/list" replace /> },
          {
            path: 'list',
            element: (
              <SuspenseWrapper>
                <SupportRequestListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'create',
            element: (
              <SuspenseWrapper>
                <SupportRequestCreatePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'detail/:id',
            element: (
              <SuspenseWrapper>
                <SupportRequestDetailPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'report',
        children: [
          { index: true, element: <Navigate to="/report/list" replace /> },
          {
            path: 'list',
            element: (
              <SuspenseWrapper>
                <ProductionReportListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'create',
            element: (
              <SuspenseWrapper>
                <ProductionReportCreatePage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'labor-hour-report',
        children: [
          { index: true, element: <Navigate to="/labor-hour-report/list" replace /> },
          {
            path: 'list',
            element: (
              <SuspenseWrapper>
                <LaborHourReportListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'create',
            element: (
              <SuspenseWrapper>
                <LaborHourReportCreatePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: ':id',
            element: (
              <SuspenseWrapper>
                <LaborHourReportDetailPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
      {
        path: 'bi-report',
        children: [
          { index: true, element: <Navigate to="/bi-report/datasource" replace /> },
          {
            path: 'datasource',
            element: (
              <SuspenseWrapper>
                <DataSourceManagePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'models',
            element: (
              <SuspenseWrapper>
                <DataModelListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'models/:id',
            element: (
              <SuspenseWrapper>
                <DataModelDetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'models/create',
            element: (
              <SuspenseWrapper>
                <DataModelEditPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'models/:id/edit',
            element: (
              <SuspenseWrapper>
                <DataModelEditPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'models/composite/create',
            element: (
              <SuspenseWrapper>
                <CompositeModelEditPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'models/process/create',
            element: (
              <SuspenseWrapper>
                <DataProcessEditorPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'reports',
            element: (
              <SuspenseWrapper>
                <BiReportListPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'reports/create',
            element: (
              <SuspenseWrapper>
                <BiReportDesignerPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'reports/:id',
            element: (
              <SuspenseWrapper>
                <BiReportViewPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: 'reports/:id/edit',
            element: (
              <SuspenseWrapper>
                <BiReportDesignerPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },
]);

export default router;
