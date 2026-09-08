import { publicCredentialedClient, unwrap, type ApiEnvelope } from "@shared/api";
import type { RecoveryPosition, RecoveryRepository } from "../recovery.types";

type Answer = ApiEnvelope<RecoveryPosition>;

// The credentialed public client, not the authenticated one: these endpoints
// read a cookie and no token, and a signed-out reader has no session to refresh.
export const restRecovery = (client = publicCredentialedClient): RecoveryRepository => ({
  position: async () => unwrap(await client.get<Answer>("/auth/password-reset/session")),

  request: async (email) => unwrap(await client.post<Answer>("/auth/password-reset", { email })),

  // An empty object rather than no body: the server refuses a body that never
  // parsed as JSON, which is what keeps a cross-site form post out.
  resend: async () => unwrap(await client.post<Answer>("/auth/password-reset/resend", {})),

  confirm: async (code) => {
    await client.post("/auth/password-reset/confirm", { code });
  },

  apply: async (newPassword) => {
    await client.post("/auth/password-reset/apply", { newPassword });
  },
});
