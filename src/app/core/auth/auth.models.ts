export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
}

export interface AuthResponse {
  user: AuthUser;
}