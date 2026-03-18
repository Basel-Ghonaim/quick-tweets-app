export interface LoginRequestCredentials {
  username: string;
  password: string;
  rememberMe?: string;
}

export interface RegisterRequestCredentials {
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  email: string;
  profileImage: File;
  policy: boolean;
}
