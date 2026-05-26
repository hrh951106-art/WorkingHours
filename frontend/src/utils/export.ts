import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

/**
 * 导出数据到Excel文件
 * @param data 要导出的数据数组
 * @param filename 文件名（不含扩展名）
 * @param sheetName 工作表名称
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1'
) {
  if (!data || data.length === 0) {
    console.warn('没有数据可导出');
    return;
  }

  // 转换数据为Excel友好的格式
  const exportData = data.map((item) => {
    const rowData: Record<string, any> = {};

    Object.keys(item).forEach((key) => {
      const value = item[key];

      // 处理日期对象
      if (dayjs.isDayjs(value)) {
        rowData[key] = value.format('YYYY-MM-DD HH:mm:ss');
      }
      // 处理日期字符串
      else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const date = dayjs(value);
        rowData[key] = date.isValid() ? date.format('YYYY-MM-DD HH:mm:ss') : value;
      }
      // 处理对象和数组
      else if (typeof value === 'object' && value !== null) {
        rowData[key] = JSON.stringify(value);
      }
      // 处理null和undefined
      else if (value === null || value === undefined) {
        rowData[key] = '';
      }
      else {
        rowData[key] = value;
      }
    });

    return rowData;
  });

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // 设置列宽
  const colWidths = Object.keys(exportData[0] || {}).map((key) => {
    let maxLength = key.length;
    exportData.forEach((row) => {
      const cellValue = String(row[key] || '');
      maxLength = Math.max(maxLength, cellValue.length);
    });
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;

  // 创建工作簿
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // 生成文件名（添加时间戳）
  const timestamp = dayjs().format('YYYYMMDD_HHmmss');
  const fullFilename = `${filename}_${timestamp}.xlsx`;

  // 下载文件
  XLSX.writeFile(workbook, fullFilename);
}

/**
 * 导出生产报工数据到Excel
 */
export interface ProductionReportExportData {
  申请编号: string;
  报工日期: string;
  报工类型: string;
  申请人: string;
  申请部门: string;
  产线: string;
  班次: string;
  产品编码: string;
  产品名称: string;
  工序: string;
  计划数量: number;
  实际数量: number;
  合格数量: number;
  不合格数量: number;
  标准工时: number;
  总标准工时: number;
  实际工时: number;
  审批状态: string;
  申请时间: string;
}

export function exportProductionReports(data: any[], filename: string = '生产报工数据') {
  const exportData: ProductionReportExportData[] = data.map((item) => ({
    申请编号: item.instanceNo || '',
    报工日期: item.reportDate ? dayjs(item.reportDate).format('YYYY-MM-DD') : '',
    报工类型: item.reportType || '',
    申请人: item.reporterName || '',
    申请部门: item.reporterOrgName || '',
    产线: item.reporterLineName || '',
    班次: item.shiftName || '',
    产品编码: item.productCode || '',
    产品名称: item.productName || '',
    工序: item.processName || '',
    计划数量: item.plannedQty || 0,
    实际数量: item.actualQty || 0,
    合格数量: item.qualifiedQty || 0,
    不合格数量: item.unqualifiedQty || 0,
    标准工时: item.standardHours || 0,
    总标准工时: item.totalStdHours || 0,
    实际工时: item.workHours || 0,
    审批状态: formatWorkflowStatus(item.instance?.status),
    申请时间: item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '',
  }));

  exportToExcel(exportData, filename, '生产报工');
}

/**
 * 导出工时报工数据到Excel
 */
export interface LaborHourReportExportData {
  申请编号: string;
  报工日期: string;
  员工编号: string;
  员工姓名: string;
  工时类型: string;
  开始时间: string;
  结束时间: string;
  工时数量: string;
  单位: string;
  报工归属: string;
  审批状态: string;
  申请时间: string;
}

export function exportLaborHourReports(data: any[], filename: string = '工时报工数据') {
  const exportData: LaborHourReportExportData[] = data.map((item) => ({
    申请编号: item.instanceNo || '',
    报工日期: item.reportDate ? dayjs(item.reportDate).format('YYYY-MM-DD') : '',
    员工编号: item.employeeNo || '',
    员工姓名: item.employeeName || '',
    工时类型: item.hourTypeName || '',
    开始时间: item.startTime || '',
    结束时间: item.endTime || '',
    工时数量: `${item.value || 0} ${item.unit || '小时'}`,
    单位: item.unit || '小时',
    报工归属: formatAccountAllocations(item.accountAllocations),
    审批状态: formatWorkflowStatus(item.instance?.status),
    申请时间: item.createdAt ? dayjs(item.createdAt).format('YYYY-MM-DD HH:mm') : '',
  }));

  exportToExcel(exportData, filename, '工时报工');
}

/**
 * 格式化工作流状态
 */
function formatWorkflowStatus(status?: string): string {
  const statusMap: Record<string, string> = {
    PENDING: '审批中',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    CANCELLED: '已取消',
  };
  return statusMap[status || ''] || status || '';
}

/**
 * 格式化账户归属信息
 */
function formatAccountAllocations(allocations?: Array<{ accountName: string; allocationRatio: number }>): string {
  if (!allocations || allocations.length === 0) {
    return '';
  }

  return allocations
    .map((alloc) => `${alloc.accountName}(${alloc.allocationRatio}%)`)
    .join('; ');
}
