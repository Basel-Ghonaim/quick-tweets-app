export interface AuthResponse {
  user: UserDto;
  token: string;
}

export interface UserDto {
  username: string;
  name: string;
  email: string;
  id: number;
  profile_image: string;
  comments_count: number;
  posts_count: number;
}
