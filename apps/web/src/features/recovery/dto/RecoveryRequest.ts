export interface RequestCodeDto {
  email: string;
}

export interface ConfirmCodeDto {
  code: string;
}

export interface ApplyPasswordDto {
  newPassword: string;
}
