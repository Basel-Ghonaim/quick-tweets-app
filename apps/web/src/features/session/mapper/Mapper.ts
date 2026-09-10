import type { LoginCredentials, RegisterCredentials } from "../session.types";
import type { LoginRequestDto, RegisterRequestDto } from "../dto";

export interface AuthMapper {
  loginCredentialsToDto: (data: LoginCredentials) => LoginRequestDto;
  registerCredentialsToDto: (data: RegisterCredentials) => RegisterRequestDto;
}
