import type { AuthMapper } from "./Mapper";

export const authMapper = (): AuthMapper => ({
  toAuthResponse: (data) => ({
    user: {
      id: data.user.id,
      username: data.user.username,
    },
    accessToken: data.accessToken,
  }),

  loginCredentialsToDto: (data) => ({
    identifier: data.identifier,
    password: data.password,
  }),
  registerCredentialsToDto: (data) => ({
    username: data.username,
    email: data.email,
    password: data.password,
  }),
});
