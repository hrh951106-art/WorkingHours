import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initWorkflowDefinitions() {
  console.log('开始初始化工作流定义...');

  try {
    // 创建支援申请工作流定义
    const supportWorkflow = await prisma.workflowDefinition.upsert({
      where: { code: 'SUPPORT_REQUEST' },
      update: {},
      create: {
        code: 'SUPPORT_REQUEST',
        name: '支援申请流程',
        category: 'SUPPORT_REQUEST',
        version: 1,
        description: '跨部门/跨产线支援申请审批流程',
        formConfig: JSON.stringify({
          fields: [
            { key: 'requestDate', label: '申请日期', type: 'date', required: true },
            { key: 'requestType', label: '支援类型', type: 'select', required: true, options: ['临时支援', '长期支援', '紧急支援'] },
            { key: 'urgency', label: '紧急程度', type: 'select', required: true, options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], optionsLabels: { LOW: '低', MEDIUM: '中', HIGH: '高', URGENT: '紧急' } },
            { key: 'targetOrgId', label: '目标组织', type: 'organization', required: true },
            { key: 'targetOrgName', label: '目标组织名称', type: 'text', readonly: true },
            { key: 'targetLineId', label: '目标产线', type: 'line', required: false },
            { key: 'targetLineName', label: '目标产线名称', type: 'text', readonly: true },
            { key: 'startTime', label: '开始时间', type: 'datetime', required: true },
            { key: 'endTime', label: '结束时间', type: 'datetime', required: true },
            { key: 'workHours', label: '预计工时', type: 'number', required: true },
            { key: 'supportReason', label: '支援原因', type: 'textarea', required: true },
            { key: 'workContent', label: '工作内容', type: 'textarea', required: false },
            { key: 'expectedOutput', label: '预期产出', type: 'textarea', required: false },
          ],
        }),
        flowConfig: JSON.stringify({
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 250, y: 50 },
              data: { label: '开始' }
            },
            {
              id: 'dept_approval',
              type: 'approval',
              position: { x: 250, y: 200 },
              data: {
                label: '部门主管审批',
                approvalType: 'SINGLE',
                approverStrategy: ['DEPT_LEADER']
              }
            },
            {
              id: 'target_approval',
              type: 'approval',
              position: { x: 250, y: 350 },
              data: {
                label: '接收部门审批',
                approvalType: 'SINGLE',
                approverStrategy: ['TARGET_DEPT_LEADER']
              }
            },
            {
              id: 'end',
              type: 'end',
              position: { x: 250, y: 500 },
              data: { label: '结束' }
            }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'dept_approval', type: 'smoothstep' },
            { id: 'e2', source: 'dept_approval', target: 'target_approval', type: 'smoothstep', label: '批准' },
            { id: 'e3', source: 'dept_approval', target: 'end', type: 'smoothstep', label: '拒绝' },
            { id: 'e4', source: 'target_approval', target: 'end', type: 'smoothstep', label: '批准' },
            { id: 'e5', source: 'target_approval', target: 'end', type: 'smoothstep', label: '拒绝' }
          ],
        }),
        status: 'PUBLISHED',
        isSystem: true,
        createdById: 1,
        createdByName: '系统管理员',
        publishedAt: new Date(),
      },
    });

    console.log('支援申请工作流定义创建成功:', supportWorkflow.id);

    // 创建报工申请工作流定义
    const reportWorkflow = await prisma.workflowDefinition.upsert({
      where: { code: 'PRODUCTION_REPORT' },
      update: {},
      create: {
        code: 'PRODUCTION_REPORT',
        name: '报工申请流程',
        category: 'PRODUCTION_REPORT',
        version: 1,
        description: '生产报工审批流程',
        formConfig: JSON.stringify({
          fields: [
            { key: 'reportDate', label: '报工日期', type: 'date', required: true },
            { key: 'reportType', label: '报工类型', type: 'select', required: true, options: ['正常报工', '返工报工', '试生产报工'] },
            { key: 'reporterLineId', label: '产线', type: 'line', required: false },
            { key: 'reporterLineName', label: '产线名称', type: 'text', readonly: true },
            { key: 'shiftId', label: '班次', type: 'shift', required: false },
            { key: 'shiftName', label: '班次名称', type: 'text', readonly: true },
            { key: 'productId', label: '产品', type: 'product', required: true },
            { key: 'productCode', label: '产品编码', type: 'text', readonly: true },
            { key: 'productName', label: '产品名称', type: 'text', readonly: true },
            { key: 'processId', label: '工序', type: 'process', required: false },
            { key: 'processName', label: '工序名称', type: 'text', readonly: true },
            { key: 'plannedQty', label: '计划数量', type: 'number', required: true },
            { key: 'actualQty', label: '实际数量', type: 'number', required: true },
            { key: 'qualifiedQty', label: '合格数量', type: 'number', required: true },
            { key: 'unqualifiedQty', label: '不合格数量', type: 'number', required: false },
            { key: 'standardHours', label: '标准工时', type: 'number', required: true },
            { key: 'totalStdHours', label: '总标准工时', type: 'number', required: true },
            { key: 'workHours', label: '实际工时', type: 'number', required: false },
            { key: 'unqualifiedReason', label: '不合格原因', type: 'textarea', required: false },
            { key: 'rectificationQty', label: '返工数量', type: 'number', required: false },
            { key: 'attachments', label: '附件', type: 'file', required: false },
            { key: 'remarks', label: '备注', type: 'textarea', required: false },
          ],
        }),
        flowConfig: JSON.stringify({
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 250, y: 50 },
              data: { label: '开始' }
            },
            {
              id: 'line_leader_approval',
              type: 'approval',
              position: { x: 250, y: 200 },
              data: {
                label: '线长审批',
                approvalType: 'SINGLE',
                approverStrategy: ['LINE_LEADER']
              }
            },
            {
              id: 'workshop_approval',
              type: 'approval',
              position: { x: 250, y: 350 },
              data: {
                label: '车间审批',
                approvalType: 'SINGLE',
                approverStrategy: ['WORKSHOP_LEADER']
              }
            },
            {
              id: 'end',
              type: 'end',
              position: { x: 250, y: 500 },
              data: { label: '结束' }
            }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'line_leader_approval', type: 'smoothstep' },
            { id: 'e2', source: 'line_leader_approval', target: 'workshop_approval', type: 'smoothstep', label: '批准' },
            { id: 'e3', source: 'line_leader_approval', target: 'end', type: 'smoothstep', label: '拒绝' },
            { id: 'e4', source: 'workshop_approval', target: 'end', type: 'smoothstep', label: '批准' },
            { id: 'e5', source: 'workshop_approval', target: 'end', type: 'smoothstep', label: '拒绝' }
          ],
        }),
        status: 'PUBLISHED',
        isSystem: true,
        createdById: 1,
        createdByName: '系统管理员',
        publishedAt: new Date(),
      },
    });

    console.log('报工申请工作流定义创建成功:', reportWorkflow.id);

    // 创建工时报工工作流定义
    const laborHourReportWorkflow = await prisma.workflowDefinition.upsert({
      where: { code: 'LABOR_HOUR_REPORT' },
      update: {},
      create: {
        code: 'LABOR_HOUR_REPORT',
        name: '工时报工流程',
        category: 'LABOR_HOUR_REPORT',
        version: 1,
        description: '工时报工申请审批流程',
        formConfig: JSON.stringify({
          fields: [
            { key: 'reportDate', label: '报工日期', type: 'date', required: true },
            { key: 'employeeId', label: '报工人员ID', type: 'number', required: true },
            { key: 'employeeNo', label: '报工人员编号', type: 'text', required: true },
            { key: 'employeeName', label: '报工人员姓名', type: 'text', required: true },
            { key: 'hourType', label: '工时类型', type: 'text', required: true },
            { key: 'hourTypeName', label: '工时类型名称', type: 'text', required: true },
            { key: 'startTime', label: '开始时间', type: 'time', required: true },
            { key: 'endTime', label: '结束时间', type: 'time', required: true },
            { key: 'value', label: '工时数量', type: 'number', required: true },
            { key: 'unit', label: '单位', type: 'text', required: true },
            { key: 'description', label: '详细描述', type: 'textarea', required: false },
            { key: 'accountAllocations', label: '账户分摊', type: 'json', required: true },
          ],
        }),
        flowConfig: JSON.stringify({
          nodes: [
            {
              id: 'start',
              type: 'start',
              position: { x: 250, y: 50 },
              data: { label: '开始' }
            },
            {
              id: 'dept_approval',
              type: 'approval',
              position: { x: 250, y: 200 },
              data: {
                label: '部门主管审批',
                approvalType: 'SINGLE',
                approverStrategy: ['DEPT_LEADER']
              }
            },
            {
              id: 'end',
              type: 'end',
              position: { x: 250, y: 350 },
              data: { label: '结束' }
            }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'dept_approval', type: 'smoothstep' },
            { id: 'e2', source: 'dept_approval', target: 'end', type: 'smoothstep', label: '批准' },
            { id: 'e3', source: 'dept_approval', target: 'end', type: 'smoothstep', label: '拒绝' }
          ],
        }),
        status: 'PUBLISHED',
        isSystem: true,
        createdById: 1,
        createdByName: '系统管理员',
        publishedAt: new Date(),
      },
    });

    console.log('工时报工工作流定义创建成功:', laborHourReportWorkflow.id);

    // 为支援申请工作流创建节点
    const supportNodes = [
      {
        workflowId: supportWorkflow.id,
        nodeCode: 'start',
        nodeType: 'START',
        nodeName: '开始节点',
        sortOrder: 0,
        status: 'ACTIVE',
      },
      {
        workflowId: supportWorkflow.id,
        nodeCode: 'dept_approval',
        nodeType: 'APPROVAL',
        nodeName: '部门主管审批',
        approvalType: 'SINGLE',
        approverStrategy: 'DEPT_LEADER',
        approverConfig: '{}',
        sortOrder: 1,
        status: 'ACTIVE',
      },
      {
        workflowId: supportWorkflow.id,
        nodeCode: 'target_approval',
        nodeType: 'APPROVAL',
        nodeName: '接收部门审批',
        approvalType: 'SINGLE',
        approverStrategy: 'TARGET_DEPT_LEADER',
        approverConfig: '{}',
        sortOrder: 2,
        status: 'ACTIVE',
      },
      {
        workflowId: supportWorkflow.id,
        nodeCode: 'end',
        nodeType: 'END',
        nodeName: '结束节点',
        sortOrder: 3,
        status: 'ACTIVE',
      },
    ];

    for (const node of supportNodes) {
      await prisma.workflowNode.upsert({
        where: { nodeCode: node.nodeCode },
        update: {},
        create: node,
      });
    }

    console.log('支援申请工作流节点创建成功');

    // 为报工申请工作流创建节点
    const reportNodes = [
      {
        workflowId: reportWorkflow.id,
        nodeCode: 'start',
        nodeType: 'START',
        nodeName: '开始节点',
        sortOrder: 0,
        status: 'ACTIVE',
      },
      {
        workflowId: reportWorkflow.id,
        nodeCode: 'line_leader_approval',
        nodeType: 'APPROVAL',
        nodeName: '线长审批',
        approvalType: 'SINGLE',
        approverStrategy: 'LINE_LEADER',
        approverConfig: '{}',
        sortOrder: 1,
        status: 'ACTIVE',
      },
      {
        workflowId: reportWorkflow.id,
        nodeCode: 'workshop_approval',
        nodeType: 'APPROVAL',
        nodeName: '车间审批',
        approvalType: 'SINGLE',
        approverStrategy: 'WORKSHOP_LEADER',
        approverConfig: '{}',
        sortOrder: 2,
        status: 'ACTIVE',
      },
      {
        workflowId: reportWorkflow.id,
        nodeCode: 'end',
        nodeType: 'END',
        nodeName: '结束节点',
        sortOrder: 3,
        status: 'ACTIVE',
      },
    ];

    for (const node of reportNodes) {
      await prisma.workflowNode.upsert({
        where: { nodeCode: node.nodeCode },
        update: {},
        create: node,
      });
    }

    console.log('报工申请工作流节点创建成功');

    // 为工时报工工作流创建节点
    const laborHourReportNodes = [
      {
        workflowId: laborHourReportWorkflow.id,
        nodeCode: 'start',
        nodeType: 'START',
        nodeName: '开始节点',
        sortOrder: 0,
        status: 'ACTIVE',
      },
      {
        workflowId: laborHourReportWorkflow.id,
        nodeCode: 'dept_approval',
        nodeType: 'APPROVAL',
        nodeName: '部门主管审批',
        approvalType: 'SINGLE',
        approverStrategy: 'DEPT_LEADER',
        approverConfig: '{}',
        sortOrder: 1,
        status: 'ACTIVE',
      },
      {
        workflowId: laborHourReportWorkflow.id,
        nodeCode: 'end',
        nodeType: 'END',
        nodeName: '结束节点',
        sortOrder: 2,
        status: 'ACTIVE',
      },
    ];

    for (const node of laborHourReportNodes) {
      await prisma.workflowNode.upsert({
        where: { nodeCode: node.nodeCode },
        update: {},
        create: node,
      });
    }

    console.log('工时报工工作流节点创建成功');

    console.log('工作流定义初始化完成！');
  } catch (error) {
    console.error('初始化工作流定义时出错:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行初始化脚本
initWorkflowDefinitions();
