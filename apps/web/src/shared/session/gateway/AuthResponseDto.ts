export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface UserDto {
  id: number;
  username: string;
}
