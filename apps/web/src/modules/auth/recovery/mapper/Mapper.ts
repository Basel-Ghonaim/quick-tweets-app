import type {
  ApplyPasswordDto,
  ConfirmCodeDto,
  RecoveryPositionDto,
  RequestCodeDto,
} from "../dto";
import type { RecoveryPosition } from "../entity";

export interface RecoveryMapper {
  toPosition: (data: RecoveryPositionDto) => RecoveryPosition;
  emailToDto: (email: string) => RequestCodeDto;
  codeToDto: (code: string) => ConfirmCodeDto;
  newPasswordToDto: (newPassword: string) => ApplyPasswordDto;
}
