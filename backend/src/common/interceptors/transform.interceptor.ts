import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../dto/response.dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => {
        // 如果返回的数据已经是 ApiResponse 格式，直接返回
        if (data instanceof ApiResponse) {
          return data;
        }
        // 否则包装成成功响应
        return ApiResponse.ok(data);
      }),
    );
  }
}
