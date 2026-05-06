import type { AuthMapper } from "./Mapper";

export const authMapper = (): AuthMapper => ({
  toAuthResponse: (data) => ({
    user: {
      id: data.user.id,
      username: data.user.username,
      name: data.user.name,
      email: data.user.email,
      profileImage: data.user.profileImage,
      bio: data.user.bio,
      createdAt: data.user.createdAt,
    },
    accessToken: data.accessToken,
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
  }),
});
