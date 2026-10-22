import { describe, it, expect } from "vitest";
import { parseStageBody, reserveFailure } from "../../supabase/functions/_shared/staging";

const img = "data:image/jpeg;base64,AAAA";

describe("parseStageBody", () => {
  it("rejects a missing or non-image body before any credit is reserved", () => {
    expect(parseStageBody(null)).toMatchObject({ ok: false, code: "bad_body" });
    expect(parseStageBody({})).toMatchObject({ ok: false, code: "no_image" });
    expect(parseStageBody({ image: "javascript:alert(1)" })).toMatchObject({ ok: false, code: "no_image" });
  });

  it("requires an instruction for refine", () => {
    expect(parseStageBody({ image: img, mode: "refine", refineInstruction: "   " })).toMatchObject({
      ok: false,
      code: "empty_refine",
    });
  });

  it("clips free text and drops unknown aspect ratios", () => {
    const r = parseStageBody({
      image: img,
      roomType: "x".repeat(500),
      customInstructions: "y".repeat(1000),
      aspectRatio: "21:9",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.roomType).toHaveLength(80);
    expect(r.value.customInstructions).toHaveLength(300);
    expect(r.value.aspectRatio).toBeNull();
  });

  it("never asks for an MLS label on furniture removal", () => {
    const r = parseStageBody({ image: img, mode: "remove", mls_disclosure: true });
    expect(r.ok && r.value.wantsMlsLabel).toBe(false);
    const s = parseStageBody({ image: img, mls_disclosure: true });
    expect(s.ok && s.value.wantsMlsLabel).toBe(true);
  });
});

describe("reserveFailure", () => {
  it("maps quota and rate-limit results to the right status", () => {
    expect(reserveFailure("rate_limited", "pro").status).toBe(429);
    expect(reserveFailure("quota_exceeded", "free")).toMatchObject({ status: 402 });
    expect(reserveFailure("quota_exceeded", "free").message).toMatch(/free/);
    expect(reserveFailure("quota_exceeded", "studio").message).toMatch(/plan's monthly/);
    expect(reserveFailure("no_usage", "free").status).toBe(403);
  });
});
