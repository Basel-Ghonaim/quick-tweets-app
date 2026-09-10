import { publicCredentialedClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { RecoveryPositionDto } from "../dto";
import { recoveryMapper } from "../mapper";
import type { RecoveryRepository } from "./RecoveryRepository";

type Answer = ApiEnvelope<RecoveryPositionDto>;

// The credentialed public client, not the authenticated one: these endpoints
// read a cookie and no token, and a signed-out reader has no session to refresh.
export const restRecovery = (
  client = publicCredentialedClient,
  mapper = recoveryMapper(),
): RecoveryRepository => ({
  position: async () =>
    mapper.toPosition(unwrap(await client.get<Answer>("/auth/password-reset/session"))),

  request: async (email) =>
    mapper.toPosition(
      unwrap(await client.post<Answer>("/auth/password-reset", mapper.emailToDto(email))),
    ),

  // An empty object rather than no body: the server refuses a body that never
  // parsed as JSON, which is what keeps a cross-site form post out.
  resend: async () =>
    mapper.toPosition(unwrap(await client.post<Answer>("/auth/password-reset/resend", {}))),

  confirm: async (code) => {
    await client.post("/auth/password-reset/confirm", mapper.codeToDto(code));
  },

  apply: async (newPassword) => {
    await client.post("/auth/password-reset/apply", mapper.newPasswordToDto(newPassword));
  },
});
