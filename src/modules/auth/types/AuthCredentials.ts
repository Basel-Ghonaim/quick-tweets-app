export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  email: string;
  confirmPassword: string;
  privacy: boolean;
}
