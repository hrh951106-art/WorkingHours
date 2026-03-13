import request from '@/utils/request';

export interface LoginDto {
  username: string;
  password: string;
}

export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
  functionalPermissions: string;
  dataScopeType: string;
}

export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  roles: Role[];
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export const authService = {
  login: (data: LoginDto) =>
    request.post<any, LoginResponse>('/auth/login', data),

  logout: () => request.post('/auth/logout'),

  getProfile: () => request.get<any, User>('/auth/profile'),
};
