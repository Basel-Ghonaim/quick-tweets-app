import type { LoginCredentials, RegisterCredentials } from "../../types";
import type {
  LoginRequestDto,
  RegisterRequestDto,
  AuthResponseDto,
} from "../dto";
import type { AuthResponse } from "../entity";

export interface AuthMapper {
  loginCredentialsToDto: (data: LoginCredentials) => LoginRequestDto;
  registerCredentialsToDto: (data: RegisterCredentials) => RegisterRequestDto;
  toAuthResponse: (data: AuthResponseDto) => AuthResponse;
}
