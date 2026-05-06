export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface RegisterRequestDto {
  username: string;
  name: string;
  email: string;
  password: string;
  profileImage: File | null;
}
