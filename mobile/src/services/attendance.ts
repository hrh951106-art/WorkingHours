import request from '@/utils/request';

export interface PunchRecord {
  id: number;
  employeeNo: string;
  employeeName: string;
  punchTime: string;
  deviceName?: string;
  direction?: string;
}

export interface CalcResult {
  id: number;
  employeeNo: string;
  employeeName: string;
  calcDate: string;
  shiftName?: string;
  workHours: number;
  overtimeHours: number;
  lateMinutes: number;
  earlyMinutes: number;
  status: string;
  details?: string;
}

export const attendanceService = {
  // 个人打卡记录
  getPunchRecords: (params: { startDate: string; endDate: string; employeeNo?: string }) =>
    request.get<any, { data: PunchRecord[]; total: number }>('/punch/records', { params }),

  // 工时计算结果
  getCalcResults: (params: { startDate?: string; endDate?: string; employeeNo?: string }) =>
    request.get<any, { data: CalcResult[]; total: number }>('/calculate/results', { params }),

  // 个人考勤视图
  getPersonalView: (params: { employeeNo: string; month: string }) =>
    request.get<any, any>('/attendance/personal', { params }),
};
