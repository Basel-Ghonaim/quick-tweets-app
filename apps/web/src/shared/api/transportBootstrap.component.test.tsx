import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { AppError } from "@shared/errors";
import { server } from "@testing/server";
import { api } from "@testing/api";
import { authClient } from "./authClient";

/**
 * A check on the lane rather than on the product: `authClient` carries no
 * interceptors until the composition root wires them, and this lane's setup is
 * what does it. Without that, an error arrives as the transport's own and
 * nothing that reads a normalized one can tell a refusal apart from any other
 * failure — a divergence no screen's test would report, because a screen
 * renders its failure state either way.
 *
 * Which type a status maps to is `parserUtils.test.ts`'s. This asserts only
 * that the normalizer is in the chain at all, which is what attachment looks
 * like from outside: asserting the handler list would assert the mechanism.
 */
describe("the lane's transport is bootstrapped", () => {
  it("delivers an HTTP failure as a normalized AppError", async () => {
    server.use(http.get(api("/bootstrap-check"), () => new HttpResponse(null, { status: 400 })));

    await expect(authClient.get("/bootstrap-check")).rejects.toBeInstanceOf(AppError);
  });
});
