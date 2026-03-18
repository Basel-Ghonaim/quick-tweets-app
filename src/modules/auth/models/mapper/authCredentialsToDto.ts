import type { LoginRequestDto, RegisterRequestDto } from "../dto/AuthRequest";
import type {
  LoginRequestCredentials,
  RegisterRequestCredentials,
} from "../entity/AuthRequest";

export const loginCredentialsToDto = (
  data: LoginRequestCredentials,
): LoginRequestDto => ({
  username: data.username,
  password: data.password,
});

export const registerCredentialsToDto = (
  data: RegisterRequestCredentials,
): RegisterRequestDto => ({
  username: data.username,
  name: data.name,
  email: data.email,
  password: data.password,
  image: data.profileImage,
});
