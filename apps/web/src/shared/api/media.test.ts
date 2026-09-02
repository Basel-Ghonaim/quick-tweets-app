import { describe, expect, it, vi } from "vitest";
import { uploadMedia } from "./media";

const ok = { data: { success: true, data: { token: "t0ken", contentType: "image/png", size: 12 } } };

const clientThatCaptures = () => {
  const calls: { url: string; body: FormData; config?: { timeout?: number } }[] = [];
  return {
    calls,
    client: {
      post: vi.fn(async (url: string, body: FormData, config?: { timeout?: number }) => {
        calls.push({ url, body, config });
        return ok;
      }),
    } as never,
  };
};

const png = () => new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });

describe("uploadMedia", () => {
  it("returns the reference the server derived, not what the client declared", async () => {
    const { client } = clientThatCaptures();

    await expect(uploadMedia(png(), client)).resolves.toEqual({
      token: "t0ken",
      contentType: "image/png",
      size: 12,
    });
  });

  it("sends the file under the field name the ingest route requires", async () => {
    const { calls, client } = clientThatCaptures();

    await uploadMedia(png(), client);

    expect(calls[0].url).toBe("/media");
    expect(calls[0].body.get("file")).toBeInstanceOf(File);
  });

  it("overrides the shared timeout, which is sized for a JSON round trip", async () => {
    const { calls, client } = clientThatCaptures();

    await uploadMedia(png(), client);

    expect(calls[0].config?.timeout).toBe(60_000);
  });
});
