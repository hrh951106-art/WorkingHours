export class ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  static ok<T>(data?: T, message: string = '操作成功'): ApiResponse<T> {
    return new ApiResponse(true, message, data);
  }

  static fail(message: string = '操作失败'): ApiResponse {
    return new ApiResponse(false, message);
  }
}

export class PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  constructor(items: T[], total: number, page: number, pageSize: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(total / pageSize);
  }
}
