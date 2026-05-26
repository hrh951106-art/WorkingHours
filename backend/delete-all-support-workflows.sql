-- 删除所有支援申请相关的流程定义
-- 删除所有 category 为 SUPPORT_REQUEST 的流程

-- 查看要删除的流程
SELECT id, name, category, code, status FROM WorkflowDefinition WHERE category = 'SUPPORT_REQUEST';

-- 删除流程定义（包括相关的实例、审批记录等）
DELETE FROM WorkflowApproval WHERE instanceId IN (
  SELECT id FROM WorkflowInstance WHERE workflowId IN (
    SELECT id FROM WorkflowDefinition WHERE category = 'SUPPORT_REQUEST'
  )
);

DELETE FROM WorkflowCcRecord WHERE instanceId IN (
  SELECT id FROM WorkflowInstance WHERE workflowId IN (
    SELECT id FROM WorkflowDefinition WHERE category = 'SUPPORT_REQUEST'
  )
);

DELETE FROM WorkflowInstance WHERE workflowId IN (
  SELECT id FROM WorkflowDefinition WHERE category = 'SUPPORT_REQUEST'
);

DELETE FROM WorkflowEdge WHERE workflowId IN (
  SELECT id FROM WorkflowDefinition WHERE category = 'SUPPORT_REQUEST'
);

DELETE FROM WorkflowNode WHERE workflowId IN (
  SELECT id FROM WorkflowDefinition WHERE category = 'SUPPORT_REQUEST'
);

DELETE FROM WorkflowDefinition WHERE category = 'SUPPORT_REQUEST';

-- 验证删除结果
SELECT * FROM WorkflowDefinition;
