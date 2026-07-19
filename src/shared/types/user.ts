export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  /** @deprecated Always null — superseded by `avatar`; retired with the author-avatar migration. */
  profileImage: string | null;
  /** The avatar's public read token (render via GET /media/:token), or null. */
  avatar: { token: string } | null;
  bio: string;
  createdAt: string;
}
