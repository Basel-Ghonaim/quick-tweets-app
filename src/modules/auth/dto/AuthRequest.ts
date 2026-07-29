export interface LoginRequestDto {
  identifier: string;
  password: string;
}

export interface RegisterRequestDto {
  username: string;
  name: string;
  email: string;
  password: string;
}
