export interface AuthResponse {
  user: User;
  token: string;
}

export interface User {
  username: string;
  name: string;
  email: string;
  id: number;
  profileImage: string;
  counts: Counts;
}

export interface Counts {
  comments: number;
  posts: number;
}
