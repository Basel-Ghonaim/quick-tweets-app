import type { AuthMapper } from "./Mapper";

export const authMapper = (): AuthMapper => ({
  toAuthResponse: (data) => ({
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
  }),

  loginCredentialsToDto: (data) => ({
    username: data.username,
    password: data.password,
  }),
  registerCredentialsToDto: (data) => ({
    username: data.username,
    name: data.name,
    email: data.email,
    password: data.password,
    image: data.profileImage,
  }),
});
