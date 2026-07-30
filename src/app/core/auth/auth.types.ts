
export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  SUPERVISOR: "SUPERVISOR",
  STAFF: "STAFF",
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface CurrentUser {
  id: string;
  username: string;
  fullName: string;

  roles: string[];

  permissions: string[];
}

export interface LoginRequest {
  username: string;

  password: string;
}


export interface LoginResponse {
  success: boolean;

  user: CurrentUser;
}