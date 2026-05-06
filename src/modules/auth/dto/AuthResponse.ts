export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface UserDto {
  id: number;
  username: string;
  name: string;
  email: string;
  profileImage: string | null;
  bio: string;
  createdAt: string;
}
