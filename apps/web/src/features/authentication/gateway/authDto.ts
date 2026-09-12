export interface LoginRequestDto {
  identifier: string;
  password: string;
}

export interface RegisterRequestDto {
  username: string;
  email: string;
  password: string;
}
