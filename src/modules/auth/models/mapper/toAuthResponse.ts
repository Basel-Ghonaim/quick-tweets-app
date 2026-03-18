import type { AuthResponseDto } from "../dto/AuthResponse";
import type { AuthResponse } from "../entity/AuthResponse";

export const toAuthResponse = (data: AuthResponseDto): AuthResponse => ({
  user: {
    username: data.user.username,
    name: data.user.name,
    email: data.user.email,
    id: data.user.id,
    profileImage: data.user.profile_image,
    counts: {
      comments: data.user.comments_count,
      posts: data.user.posts_count,
    },
  },
  token: data.token,
});
