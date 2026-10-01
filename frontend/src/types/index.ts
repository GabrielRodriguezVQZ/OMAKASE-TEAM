export enum UserRole {
  ENFERMERIA = 'ENFERMERIA',
  QUIROFANO = 'QUIROFANO',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
