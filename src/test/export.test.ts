import { describe, it, expect } from "vitest";
import { exportNames } from "@/lib/exportListing";
import type { StagingRow } from "@/lib/stagingApi";

const row = (id: string, room: string, created: string) =>
  ({ id, room_type: room, style: "Modern", created_at: created }) as StagingRow;

describe("exportNames", () => {
  it("numbers photos in the order they were made so pairs sort together", () => {
    const out = exportNames([row("b", "Bedroom", "2026-10-02"), row("a", "Living Room", "2026-10-01")]);
    expect(out.map((o) => o.prefix)).toEqual(["01-living-room", "02-bedroom"]);
  });
  it("slugs odd room names", () => {
    expect(exportNames([row("c", "Outdoor / Patio", "2026-10-01")])[0].prefix).toBe("01-outdoor-patio");
  });
});
