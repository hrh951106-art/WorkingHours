// 数据表元数据配置
export const TABLE_METADATA: Record<string, {
  name: string;
  description: string;
  category: string;
  fields: Record<string, {
    name: string;
    description?: string;
    type?: 'dimension' | 'measure';
  }>;
}> = {
  // ============================================
  // 员工管理模块
  // ============================================
  Employee: {
    name: '员工表',
    description: '存储员工的基本信息、联系方式和组织归属',
    category: '员工管理',
    fields: {
      id: { name: '员工ID', description: '员工唯一标识' },
      employeeNo: { name: '员工编号', description: '员工的唯一编号' },
      name: { name: '姓名', description: '员工姓名', type: 'dimension' },
      gender: { name: '性别', description: '员工性别', type: 'dimension' },
      phone: { name: '手机号', description: '联系电话' },
      email: { name: '邮箱', description: '电子邮件地址' },
      orgId: { name: '组织ID', description: '所属组织' },
      entryDate: { name: '入职日期', description: '入职时间', type: 'dimension' },
      status: { name: '状态', description: '在职状态', type: 'dimension' },
      customFields: { name: '自定义字段', description: '扩展字段JSON' },
      createdAt: { name: '创建时间', description: '记录创建时间' },
      updatedAt: { name: '更新时间', description: '记录更新时间' },
    },
  },

  Organization: {
    name: '组织表',
    description: '组织架构信息，包含部门、科室等组织单元',
    category: '员工管理',
    fields: {
      id: { name: '组织ID', description: '组织唯一标识' },
      code: { name: '组织代码', description: '组织的唯一编码', type: 'dimension' },
      name: { name: '组织名称', description: '组织名称', type: 'dimension' },
      parentId: { name: '上级组织ID', description: '父组织ID' },
      type: { name: '组织类型', description: '组织类型', type: 'dimension' },
      level: { name: '层级', description: '组织层级' },
      leaderId: { name: '负责人ID', description: '组织负责人' },
      effectiveDate: { name: '生效日期', description: '组织生效时间' },
      status: { name: '状态', description: '组织状态' },
    },
  },

  // ============================================
  // 考勤模块
  // ============================================
  PunchRecord: {
    name: '打卡记录表',
    description: '存储员工的原始打卡记录数据',
    category: '考勤管理',
    fields: {
      id: { name: '记录ID', description: '打卡记录唯一标识' },
      employeeId: { name: '员工ID', description: '员工ID' },
      employeeNo: { name: '员工编号', description: '员工编号', type: 'dimension' },
      employeeName: { name: '员工姓名', description: '员工姓名', type: 'dimension' },
      punchTime: { name: '打卡时间', description: '打卡时间', type: 'dimension' },
      punchDate: { name: '打卡日期', description: '打卡日期', type: 'dimension' },
      deviceId: { name: '设备ID', description: '打卡设备ID' },
      source: { name: '数据来源', description: '数据来源' },
      location: { name: '位置', description: '打卡位置' },
      status: { name: '状态', description: '打卡状态' },
    },
  },

  PunchPair: {
    name: '打卡配对表',
    description: '上下班打卡记录配对结果',
    category: '考勤管理',
    fields: {
      id: { name: '配对ID', description: '配对记录唯一标识' },
      employeeId: { name: '员工ID', description: '员工ID' },
      employeeNo: { name: '员工编号', description: '员工编号', type: 'dimension' },
      employeeName: { name: '员工姓名', description: '员工姓名', type: 'dimension' },
      workDate: { name: '工作日期', description: '工作日期', type: 'dimension' },
      shiftId: { name: '班次ID', description: '所属班次' },
      firstPunchTime: { name: '首次打卡', description: '上班打卡时间' },
      lastPunchTime: { name: '末次打卡', description: '下班打卡时间' },
      workHours: { name: '工作时长', description: '工作小时数', type: 'measure' },
      status: { name: '配对状态', description: '配对状态' },
    },
  },

  Shift: {
    name: '班次表',
    description: '班次配置信息，定义工作时间段',
    category: '考勤管理',
    fields: {
      id: { name: '班次ID', description: '班次唯一标识' },
      name: { name: '班次名称', description: '班次名称', type: 'dimension' },
      code: { name: '班次代码', description: '班次编码' },
      startTime: { name: '开始时间', description: '上班时间' },
      endTime: { name: '结束时间', description: '下班时间' },
      lateTolerance: { name: '迟到容差', description: '允许迟到分钟数' },
      earlyTolerance: { name: '早退容差', description: '允许早退分钟数' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  Schedule: {
    name: '排班表',
    description: '员工排班计划，记录每日排班信息',
    category: '考勤管理',
    fields: {
      id: { name: '排班ID', description: '排班记录唯一标识' },
      employeeId: { name: '员工ID', description: '员工ID' },
      employeeNo: { name: '员工编号', description: '员工编号', type: 'dimension' },
      shiftId: { name: '班次ID', description: '排班班次' },
      workDate: { name: '工作日期', description: '工作日期', type: 'dimension' },
      status: { name: '状态', description: '排班状态' },
    },
  },

  // ============================================
  // 工时模块
  // ============================================
  WorkHourResult: {
    name: '工时结果表',
    description: '员工工时计算结果，包含每日工时明细',
    category: '工时管理',
    fields: {
      id: { name: '结果ID', description: '工时结果唯一标识' },
      employeeId: { name: '员工ID', description: '员工ID' },
      employeeNo: { name: '员工编号', description: '员工编号', type: 'dimension' },
      employeeName: { name: '员工姓名', description: '员工姓名', type: 'dimension' },
      workDate: { name: '工作日期', description: '工作日期', type: 'dimension' },
      shiftId: { name: '班次ID', description: '所属班次', type: 'dimension' },
      shiftName: { name: '班次名称', description: '班次名称' },
      workHours: { name: '工作工时', description: '工作时长（小时）', type: 'measure' },
      overtimeHours: { name: '加班工时', description: '加班时长（小时）', type: 'measure' },
      leaveHours: { name: '请假工时', description: '请假时长（小时）', type: 'measure' },
      attendanceCode: { name: '出勤代码', description: '出勤代码' },
      sourceType: { name: '数据来源', description: '数据来源类型' },
      status: { name: '状态', description: '结果状态' },
    },
  },

  AttendanceCode: {
    name: '出勤代码表',
    description: '出勤代码定义，如正常、请假、加班等',
    category: '工时管理',
    fields: {
      id: { name: '代码ID', description: '出勤代码唯一标识' },
      code: { name: '代码', description: '出勤代码', type: 'dimension' },
      name: { name: '名称', description: '代码名称', type: 'dimension' },
      type: { name: '类型', description: '代码类型' },
      calculateHours: { name: '计算工时', description: '是否计算工时' },
      unit: { name: '单位', description: '工时单位' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  // ============================================
  // 分摊模块
  // ============================================
  ProductionRecord: {
    name: '生产记录表',
    description: '生产产量记录数据',
    category: '分摊管理',
    fields: {
      id: { name: '记录ID', description: '生产记录唯一标识' },
      reportDate: { name: '报工日期', description: '报工日期', type: 'dimension' },
      orgId: { name: '组织ID', description: '所属组织', type: 'dimension' },
      orgName: { name: '组织名称', description: '组织名称' },
      lineId: { name: '产线ID', description: '所属产线' },
      productCode: { name: '产品代码', description: '产品代码', type: 'dimension' },
      productName: { name: '产品名称', description: '产品名称' },
      plannedQty: { name: '计划数量', description: '计划产量', type: 'measure' },
      actualQty: { name: '实际数量', description: '实际产量', type: 'measure' },
      qualifiedQty: { name: '合格数量', description: '合格产量', type: 'measure' },
      unqualifiedQty: { name: '不合格数量', description: '不合格数量', type: 'measure' },
      standardHours: { name: '标准工时', description: '标准工时' },
      workHours: { name: '实际工时', description: '实际工时', type: 'measure' },
      status: { name: '状态', description: '记录状态' },
    },
  },

  AllocationWorkHour: {
    name: '分摊工时表',
    description: '工时分摊计算结果',
    category: '分摊管理',
    fields: {
      id: { name: '分摊ID', description: '分摊记录唯一标识' },
      employeeId: { name: '员工ID', description: '员工ID' },
      employeeNo: { name: '员工编号', description: '员工编号', type: 'dimension' },
      employeeName: { name: '员工姓名', description: '员工姓名', type: 'dimension' },
      workDate: { name: '工作日期', description: '工作日期', type: 'dimension' },
      accountId: { name: '账户ID', description: '归属账户' },
      accountCode: { name: '账户代码', description: '账户代码', type: 'dimension' },
      accountName: { name: '账户名称', description: '账户名称' },
      workHours: { name: '工时', description: '分摊工时数', type: 'measure' },
      allocationRatio: { name: '分摊比例', description: '分摊比例' },
      status: { name: '状态', description: '分摊状态' },
    },
  },

  // ============================================
  // 账户模块
  // ============================================
  LaborAccount: {
    name: '劳动力账户表',
    description: '劳动力账户，用于工时分摊',
    category: '账户管理',
    fields: {
      id: { name: '账户ID', description: '账户唯一标识' },
      code: { name: '账户代码', description: '账户代码', type: 'dimension' },
      name: { name: '账户名称', description: '账户名称', type: 'dimension' },
      parentId: { name: '上级账户ID', description: '上级账户' },
      level: { name: '层级', description: '账户层级' },
      type: { name: '账户类型', description: '账户类型' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  // ============================================
  // 工作流模块
  // ============================================
  WorkflowInstance: {
    name: '工作流实例表',
    description: '工作流审批实例',
    category: '工作流管理',
    fields: {
      id: { name: '实例ID', description: '实例唯一标识' },
      instanceNo: { name: '实例编号', description: '实例编号', type: 'dimension' },
      workflowId: { name: '工作流ID', description: '工作流定义ID' },
      workflowName: { name: '工作流名称', description: '工作流名称' },
      title: { name: '标题', description: '实例标题' },
      status: { name: '状态', description: '审批状态', type: 'dimension' },
      initiatorId: { name: '发起人ID', description: '发起人ID' },
      initiatorName: { name: '发起人', description: '发起人姓名' },
      initiatedAt: { name: '发起时间', description: '发起时间', type: 'dimension' },
      createdAt: { name: '创建时间', description: '创建时间' },
    },
  },

  // ============================================
  // 报表工具模块
  // ============================================
  BiReport: {
    name: 'BI报表表',
    description: 'BI报表定义',
    category: '报表工具',
    fields: {
      id: { name: '报表ID', description: '报表唯一标识' },
      name: { name: '报表名称', description: '报表名称', type: 'dimension' },
      code: { name: '报表代码', description: '报表代码' },
      modelId: { name: '模型ID', description: '数据模型ID' },
      type: { name: '报表类型', description: '表格/图表/仪表板', type: 'dimension' },
      category: { name: '分类', description: '报表分类' },
      status: { name: '状态', description: '草稿/已发布/已归档' },
      createdBy: { name: '创建人ID', description: '创建人' },
      createdAt: { name: '创建时间', description: '创建时间' },
    },
  },

  ReportDataModel: {
    name: '数据模型表',
    description: 'BI报表数据模型定义',
    category: '报表工具',
    fields: {
      id: { name: '模型ID', description: '模型唯一标识' },
      name: { name: '模型名称', description: '模型名称', type: 'dimension' },
      code: { name: '模型代码', description: '模型代码' },
      type: { name: '类型', description: '表/SQL/API' },
      sourceTable: { name: '源表', description: '数据库表名' },
      status: { name: '状态', description: '启用状态' },
      createdAt: { name: '创建时间', description: '创建时间' },
    },
  },

  ReportModelField: {
    name: '模型字段表',
    description: '数据模型字段定义',
    category: '报表工具',
    fields: {
      id: { name: '字段ID', description: '字段唯一标识' },
      modelId: { name: '模型ID', description: '所属模型' },
      name: { name: '字段名称', description: '字段名称' },
      code: { name: '字段代码', description: '字段代码' },
      type: { name: '字段类型', description: '维度/度量' },
      dataType: { name: '数据类型', description: '数据类型' },
      sourceType: { name: '来源类型', description: '列/SQL/计算' },
      sourceExpr: { name: '来源表达式', description: '源表达式' },
      aggregation: { name: '聚合函数', description: '聚合方式' },
      sortNo: { name: '排序号', description: '排序顺序' },
    },
  },

  // ============================================
  // 员工管理模块（补充）
  // ============================================
  EmployeeChangeLog: {
    name: '员工变更日志表',
    description: '记录员工信息变更历史',
    category: '员工管理',
    fields: {
      id: { name: '日志ID', description: '日志唯一标识' },
      employeeId: { name: '员工ID', description: '员工ID' },
      employeeNo: { name: '员工编号', description: '员工编号', type: 'dimension' },
      employeeName: { name: '员工姓名', description: '员工姓名' },
      changeType: { name: '变更类型', description: '变更类型', type: 'dimension' },
      fieldName: { name: '字段名', description: '变更的字段' },
      oldValue: { name: '原值', description: '变更前的值' },
      newValue: { name: '新值', description: '变更后的值' },
      changedBy: { name: '操作人', description: '操作人ID' },
      changedAt: { name: '变更时间', description: '变更时间', type: 'dimension' },
      reason: { name: '变更原因', description: '变更原因' },
    },
  },

  CustomField: {
    name: '自定义字段表',
    description: '员工信息自定义字段定义',
    category: '员工管理',
    fields: {
      id: { name: '字段ID', description: '字段唯一标识' },
      code: { name: '字段代码', description: '字段代码', type: 'dimension' },
      name: { name: '字段名称', description: '字段名称', type: 'dimension' },
      type: { name: '字段类型', description: '文本/数字/日期等', type: 'dimension' },
      category: { name: '分类', description: '字段所属分类' },
      options: { name: '选项', description: '下拉选项配置' },
      isRequired: { name: '是否必填', description: '是否必填' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  // ============================================
  // 考勤模块（补充）
  // ============================================
  PunchDevice: {
    name: '打卡设备表',
    description: '打卡设备信息',
    category: '考勤管理',
    fields: {
      id: { name: '设备ID', description: '设备唯一标识' },
      name: { name: '设备名称', description: '设备名称', type: 'dimension' },
      code: { name: '设备代码', description: '设备代码' },
      type: { name: '设备类型', description: '设备类型', type: 'dimension' },
      location: { name: '位置', description: '设备位置' },
      ipAddress: { name: 'IP地址', description: '设备IP' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  PunchRule: {
    name: '打卡规则表',
    description: '打卡规则配置',
    category: '考勤管理',
    fields: {
      id: { name: '规则ID', description: '规则唯一标识' },
      name: { name: '规则名称', description: '规则名称', type: 'dimension' },
      type: { name: '规则类型', description: '规则类型', type: 'dimension' },
      orgId: { name: '组织ID', description: '适用组织' },
      deviceId: { name: '设备ID', description: '关联设备' },
      effectiveDate: { name: '生效日期', description: '规则生效时间' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  CalcRule: {
    name: '计算规则表',
    description: '工时计算规则配置',
    category: '考勤管理',
    fields: {
      id: { name: '规则ID', description: '规则唯一标识' },
      name: { name: '规则名称', description: '规则名称', type: 'dimension' },
      type: { name: '规则类型', description: '计算类型' },
      formula: { name: '计算公式', description: '计算公式' },
      priority: { name: '优先级', description: '规则优先级' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  // ============================================
  // 分摊模块（补充）
  // ============================================
  AllocationConfig: {
    name: '分摊配置表',
    description: '工时分摊配置',
    category: '分摊管理',
    fields: {
      id: { name: '配置ID', description: '配置唯一标识' },
      name: { name: '配置名称', description: '配置名称', type: 'dimension' },
      type: { name: '分摊类型', description: '分摊类型', type: 'dimension' },
      basisType: { name: '分摊依据', description: '分摊依据类型', type: 'dimension' },
      accountId: { name: '账户ID', description: '默认账户' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  AllocationResult: {
    name: '分摊结果表',
    description: '工时分摊计算结果',
    category: '分摊管理',
    fields: {
      id: { name: '结果ID', description: '结果唯一标识' },
      employeeId: { name: '员工ID', description: '员工ID' },
      employeeNo: { name: '员工编号', description: '员工编号', type: 'dimension' },
      employeeName: { name: '员工姓名', description: '员工姓名', type: 'dimension' },
      workDate: { name: '工作日期', description: '工作日期', type: 'dimension' },
      configId: { name: '配置ID', description: '分摊配置' },
      accountId: { name: '账户ID', description: '归属账户', type: 'dimension' },
      accountName: { name: '账户名称', description: '账户名称' },
      workHours: { name: '分摊工时', description: '分摊工时数', type: 'measure' },
      allocationRatio: { name: '分摊比例', description: '分摊比例', type: 'measure' },
      calculatedAt: { name: '计算时间', description: '计算时间' },
    },
  },

  // ============================================
  // 账户管理模块（补充）
  // ============================================
  AccountTransfer: {
    name: '账户调拨表',
    description: '账户间工时调拨记录',
    category: '账户管理',
    fields: {
      id: { name: '调拨ID', description: '调拨记录唯一标识' },
      transferNo: { name: '调拨单号', description: '调拨单号', type: 'dimension' },
      workDate: { name: '工作日期', description: '工作日期', type: 'dimension' },
      fromAccountId: { name: '调出账户', description: '调出账户ID' },
      toAccountId: { name: '调入账户', description: '调入账户ID', type: 'dimension' },
      workHours: { name: '调拨工时', description: '调拨工时数', type: 'measure' },
      reason: { name: '调拨原因', description: '调拨原因' },
      status: { name: '状态', description: '调拨状态' },
      transferredBy: { name: '操作人', description: '操作人ID' },
      transferredAt: { name: '调拨时间', description: '调拨时间', type: 'dimension' },
    },
  },

  AccountHierarchyConfig: {
    name: '账户层级配置表',
    description: '账户层级关系配置',
    category: '账户管理',
    fields: {
      id: { name: '配置ID', description: '配置唯一标识' },
      accountId: { name: '账户ID', description: '账户ID' },
      accountCode: { name: '账户代码', description: '账户代码', type: 'dimension' },
      accountName: { name: '账户名称', description: '账户名称' },
      parentId: { name: '上级账户ID', description: '上级账户' },
      level: { name: '层级', description: '账户层级', type: 'dimension' },
      path: { name: '路径', description: '层级路径' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  // ============================================
  // 生产管理模块
  // ============================================
  Product: {
    name: '产品表',
    description: '产品信息定义',
    category: '生产管理',
    fields: {
      id: { name: '产品ID', description: '产品唯一标识' },
      code: { name: '产品代码', description: '产品代码', type: 'dimension' },
      name: { name: '产品名称', description: '产品名称', type: 'dimension' },
      category: { name: '产品分类', description: '产品分类', type: 'dimension' },
      unit: { name: '单位', description: '计量单位' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  ProductionLine: {
    name: '产线表',
    description: '生产线信息',
    category: '生产管理',
    fields: {
      id: { name: '产线ID', description: '产线唯一标识' },
      code: { name: '产线代码', description: '产线代码', type: 'dimension' },
      name: { name: '产线名称', description: '产线名称', type: 'dimension' },
      orgId: { name: '组织ID', description: '所属组织' },
      capacity: { name: '产能', description: '设计产能' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  ProductStandardHours: {
    name: '产品标准工时表',
    description: '产品标准工时定额',
    category: '生产管理',
    fields: {
      id: { name: 'ID', description: '唯一标识' },
      productId: { name: '产品ID', description: '产品ID' },
      productCode: { name: '产品代码', description: '产品代码', type: 'dimension' },
      processId: { name: '工序ID', description: '工序ID' },
      processName: { name: '工序名称', description: '工序名称', type: 'dimension' },
      standardHours: { name: '标准工时', description: '单位标准工时', type: 'measure' },
      effectiveDate: { name: '生效日期', description: '生效时间' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  // ============================================
  // 系统管理模块（补充）
  // ============================================
  DataSource: {
    name: '数据源表',
    description: '字段数据源配置',
    category: '系统管理',
    fields: {
      id: { name: '数据源ID', description: '数据源唯一标识' },
      code: { name: '数据源代码', description: '数据源代码', type: 'dimension' },
      name: { name: '数据源名称', description: '数据源名称', type: 'dimension' },
      type: { name: '数据源类型', description: '数据源类型', type: 'dimension' },
      config: { name: '配置', description: '数据源配置' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  DataSourceOption: {
    name: '数据源选项表',
    description: '数据源选项值',
    category: '系统管理',
    fields: {
      id: { name: '选项ID', description: '选项唯一标识' },
      dataSourceId: { name: '数据源ID', description: '所属数据源' },
      value: { name: '选项值', description: '选项值', type: 'dimension' },
      label: { name: '选项标签', description: '显示文本', type: 'dimension' },
      sortNo: { name: '排序号', description: '排序顺序' },
      status: { name: '状态', description: '启用状态' },
    },
  },

  AuditLog: {
    name: '审计日志表',
    description: '系统操作审计日志',
    category: '系统管理',
    fields: {
      id: { name: '日志ID', description: '日志唯一标识' },
      userId: { name: '用户ID', description: '操作用户ID' },
      username: { name: '用户名', description: '操作用户名', type: 'dimension' },
      action: { name: '操作动作', description: '操作类型', type: 'dimension' },
      resource: { name: '资源', description: '操作资源' },
      resourceId: { name: '资源ID', description: '资源ID' },
      details: { name: '详细信息', description: '操作详情' },
      ipAddress: { name: 'IP地址', description: '操作IP' },
      userAgent: { name: '用户代理', description: '浏览器信息' },
      createdAt: { name: '操作时间', description: '操作时间', type: 'dimension' },
    },
  },

  // ============================================
  // 其他常用表
  // ============================================
  Role: {
    name: '角色表',
    description: '系统角色定义',
    category: '系统管理',
    fields: {
      id: { name: '角色ID', description: '角色唯一标识' },
      code: { name: '角色代码', description: '角色代码', type: 'dimension' },
      name: { name: '角色名称', description: '角色名称', type: 'dimension' },
      description: { name: '描述', description: '角色描述' },
      status: { name: '状态', description: '启用状态' },
      isDefault: { name: '是否默认', description: '默认角色' },
      createdAt: { name: '创建时间', description: '创建时间' },
    },
  },

  User: {
    name: '用户表',
    description: '系统用户账号',
    category: '系统管理',
    fields: {
      id: { name: '用户ID', description: '用户唯一标识' },
      username: { name: '用户名', description: '登录用户名', type: 'dimension' },
      name: { name: '姓名', description: '用户姓名', type: 'dimension' },
      email: { name: '邮箱', description: '电子邮箱' },
      status: { name: '状态', description: '账号状态', type: 'dimension' },
      createdAt: { name: '创建时间', description: '创建时间' },
    },
  },
};
