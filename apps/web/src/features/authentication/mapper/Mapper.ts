import type { LoginCredentials, RegisterCredentials } from "../credentials";
import type { LoginRequestDto, RegisterRequestDto } from "../dto";

export interface AuthMapper {
  loginCredentialsToDto: (data: LoginCredentials) => LoginRequestDto;
  registerCredentialsToDto: (data: RegisterCredentials) => RegisterRequestDto;
}
