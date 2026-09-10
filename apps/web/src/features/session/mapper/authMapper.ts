import type { AuthMapper } from "./Mapper";

export const authMapper = (): AuthMapper => ({
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
