export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface RegisterRequestDto {
  username: string;
  name: string;
  email: string;
  password: string;
  avatar?: { token: string; grant: string };
}
