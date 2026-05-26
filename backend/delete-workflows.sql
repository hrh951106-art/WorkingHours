-- 删除支援申请和工时报工的流程定义
-- 删除顺序：先删除子表数据，再删除主表

-- 删除支援申请流程（ID: 2, 3）
DELETE FROM WorkflowApproval WHERE instanceId IN (
  SELECT id FROM WorkflowInstance WHERE workflowId IN (2, 3)
);
DELETE FROM WorkflowCcRecord WHERE instanceId IN (
  SELECT id FROM WorkflowInstance WHERE workflowId IN (2, 3)
);
DELETE FROM WorkflowInstance WHERE workflowId IN (2, 3);
DELETE FROM WorkflowEdge WHERE workflowId IN (2, 3);
DELETE FROM WorkflowNode WHERE workflowId IN (2, 3);
DELETE FROM WorkflowDefinition WHERE id IN (2, 3);

-- 删除工时报工流程（ID: 4, 5, 7, 10, 11）
DELETE FROM WorkflowApproval WHERE instanceId IN (
  SELECT id FROM WorkflowInstance WHERE workflowId IN (4, 5, 7, 10, 11)
);
DELETE FROM WorkflowCcRecord WHERE instanceId IN (
  SELECT id FROM WorkflowInstance WHERE workflowId IN (4, 5, 7, 10, 11)
);
DELETE FROM WorkflowInstance WHERE workflowId IN (4, 5, 7, 10, 11);
DELETE FROM WorkflowEdge WHERE workflowId IN (4, 5, 7, 10, 11);
DELETE FROM WorkflowNode WHERE workflowId IN (4, 5, 7, 10, 11);
DELETE FROM WorkflowDefinition WHERE id IN (4, 5, 7, 10, 11);

-- 查看剩余的工作流
SELECT * FROM WorkflowDefinition;
