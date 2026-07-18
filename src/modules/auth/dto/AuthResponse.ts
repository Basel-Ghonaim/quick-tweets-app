export interface AuthResponseDto {
  user: UserDto;
  accessToken: string;
}

export interface UserDto {
  id: number;
  username: string;
  name: string;
  email: string;
  profileImage: string | null; // DEPRECATED (always null) — superseded by `avatar`
  avatar: { token: string } | null;
  bio: string;
  createdAt: string;
}
