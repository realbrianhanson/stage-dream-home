import { describe, it, expect, vi, afterEach } from "vitest";
import { generateWithFallback, GatewayError } from "../../supabase/functions/_shared/models";
import { gptImageSize, geminiAspect, imageDimensions } from "../../supabase/functions/_shared/sizing";

const image = { bytes: new Uint8Array([1, 2, 3]), mime: "image/jpeg", width: 2048, height: 1365 };
const args = { apiKey: "k", prompt: "p", image, n: 1, hd: true };
// jsdom lacks AbortSignal.timeout; the real runtime (Deno) has it.
if (!("timeout" in AbortSignal)) {
  Object.assign(AbortSignal, { timeout: () => new AbortController().signal });
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe("generateWithFallback", () => {
  it("sends GPT models to the image-edit endpoint as multipart", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const form = init.body as FormData;
      expect(form.get("model")).toBe("openai/gpt-image-2.5-sunburst");
      expect(form.get("size")).toBe("2048x1360");
      expect(form.get("quality")).toBe("high");
      expect(form.get("output_format")).toBe("jpeg");
      return ok({ data: [{ b64_json: btoa("abc") }] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateWithFallback(["openai/gpt-image-2.5-sunburst"], args);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/images\/edits$/);
    expect(out.model).toBe("openai/gpt-image-2.5-sunburst");
    expect(new TextDecoder().decode(out.images[0].bytes)).toBe("abc");
  });

  it("falls back to the next model when one is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unknown model", { status: 400 }))
      .mockResolvedValueOnce(ok({ choices: [{ message: { images: [{ image_url: { url: "data:image/png;base64," + btoa("png") } }] } }] }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateWithFallback(["openai/gpt-image-2.5-sunburst", "google/gemini-3-pro-image"], args);
    expect(out.model).toBe("google/gemini-3-pro-image");
    expect(out.images[0].mime).toBe("image/png");
    expect(out.attempts).toHaveLength(1);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.image_config).toEqual({ aspect_ratio: "3:2", image_size: "2K" });
  });

  it("retries Gemini without image_config if the gateway rejects it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("unknown field image_config", { status: 400 }))
      .mockResolvedValueOnce(ok({ choices: [{ message: { images: [{ image_url: { url: "data:image/png;base64,AA==" } }] } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await generateWithFallback(["google/gemini-3-pro-image"], args);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).image_config).toBeUndefined();
  });

  it("stops on rate limits instead of burning through the chain", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("slow down", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      generateWithFallback(["openai/gpt-image-2.5-sunburst", "google/gemini-3-pro-image"], args),
    ).rejects.toBeInstanceOf(GatewayError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("asks Gemini once per variation", async () => {
    const fetchMock = vi.fn(async () =>
      ok({ choices: [{ message: { images: [{ image_url: { url: "data:image/png;base64,AA==" } }] } }] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const out = await generateWithFallback(["google/gemini-3-pro-image"], { ...args, n: 3 });
    expect(out.images).toHaveLength(3);
  });
});

describe("sizing", () => {
  it("keeps the source aspect within GPT Image limits", () => {
    expect(gptImageSize(4032, 3024)).toBe("2208x1648");
    expect(gptImageSize(3024, 4032)).toBe("1648x2208");
    expect(gptImageSize(1920, 1080)).toBe("2560x1440");
    expect(gptImageSize(1000, 1000, null, 1536)).toBe("1536x1536");
    for (const s of [gptImageSize(4032, 3024), gptImageSize(800, 2000), gptImageSize(5000, 1000)]) {
      const [w, h] = s.split("x").map(Number);
      expect(w % 16).toBe(0);
      expect(h % 16).toBe(0);
      expect(w * h).toBeLessThanOrEqual(2560 * 1440);
    }
  });

  it("honors a forced ratio", () => {
    expect(gptImageSize(4032, 3024, "1:1")).toBe("1920x1920");
    expect(geminiAspect(4032, 3024)).toBe("4:3");
    expect(geminiAspect(100, 100, "16:9")).toBe("16:9");
  });

  it("reads JPEG and PNG dimensions from headers", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47]);
    new DataView(png.buffer).setUint32(16, 1600);
    new DataView(png.buffer).setUint32(20, 900);
    expect(imageDimensions(png)).toEqual({ width: 1600, height: 900 });
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x00, 0x04, 0x00, 0, 0, 0]);
    expect(imageDimensions(jpeg)).toEqual({ width: 1024, height: 768 });
  });
});
