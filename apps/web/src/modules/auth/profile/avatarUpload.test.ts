import { describe, expect, it } from "vitest";
import {
  avatarUploadInitial,
  avatarUploadReducer as reduce,
  type AvatarUploadState,
} from "./avatarUpload";

const png = () => new File([new Uint8Array([1])], "a.png", { type: "image/png" });

const uploaded = (): AvatarUploadState =>
  reduce(reduce(avatarUploadInitial, { type: "selected", file: png() }), {
    type: "succeeded",
    token: "t0ken",
  });

describe("the avatar upload's states", () => {
  it("starts idle, holding no reference", () => {
    expect(avatarUploadInitial).toEqual({ status: "idle", token: null, file: null });
  });

  it("choosing a picture starts the upload, so the wait is a state and not a submit", () => {
    const next = reduce(avatarUploadInitial, { type: "selected", file: png() });

    expect(next.status).toBe("uploading");
    expect(next.file).toBeInstanceOf(File);
  });

  it("success is the only state that produces a reference", () => {
    expect(uploaded()).toMatchObject({ status: "uploaded", token: "t0ken" });
  });

  it("a failure keeps the file and drops the reference", () => {
    const failed = reduce(uploaded(), { type: "failed" });

    expect(failed.status).toBe("failed");
    expect(failed.token).toBeNull();
    expect(failed.file).toBeInstanceOf(File);
  });

  it("a retry re-uploads the file it already has, needing no second selection", () => {
    const retried = reduce(reduce(uploaded(), { type: "failed" }), { type: "retried" });

    expect(retried.status).toBe("uploading");
    expect(retried.file).toBeInstanceOf(File);
  });

  it("a retry with nothing chosen changes nothing", () => {
    expect(reduce(avatarUploadInitial, { type: "retried" })).toEqual(avatarUploadInitial);
  });

  it("clearing the selection returns to the start", () => {
    expect(reduce(uploaded(), { type: "cleared" })).toEqual(avatarUploadInitial);
  });
});
