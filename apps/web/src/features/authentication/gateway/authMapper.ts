import type { LoginCredentials, RegisterCredentials } from "../model";
import type { LoginRequestDto, RegisterRequestDto } from "./authDto";

export interface AuthMapper {
  loginCredentialsToDto: (data: LoginCredentials) => LoginRequestDto;
  registerCredentialsToDto: (data: RegisterCredentials) => RegisterRequestDto;
}

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
