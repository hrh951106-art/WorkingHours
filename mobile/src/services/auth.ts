import request from '@/utils/request';
import type { User } from '@/stores/authStore';

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export const authService = {
  login: (data: LoginDto) =>
    request.post<any, LoginResponse>('/auth/login', data),
  getProfile: () =>
    request.get<any, User>('/auth/profile'),
};
