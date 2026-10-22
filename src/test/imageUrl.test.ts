import { describe, it, expect } from "vitest";
import { thumbUrl } from "@/lib/imageUrl";

describe("thumbUrl", () => {
  it("routes public storage images through the resizer", () => {
    expect(thumbUrl("https://x.supabase.co/storage/v1/object/public/stagings/u/s/staged.jpg", 640)).toBe(
      "https://x.supabase.co/storage/v1/render/image/public/stagings/u/s/staged.jpg?width=640&quality=72&resize=contain",
    );
  });
  it("leaves other URLs alone", () => {
    expect(thumbUrl("/src/assets/a.jpg")).toBe("/src/assets/a.jpg");
    expect(thumbUrl("data:image/png;base64,AA")).toBe("data:image/png;base64,AA");
  });
});
