import { describe, it, expect } from "vitest";
import { parseDetection } from "../../supabase/functions/_shared/detect";

describe("parseDetection", () => {
  it("suggests staging for an empty bedroom", () => {
    expect(parseDetection('{"roomType":"Bedroom","exterior":false,"furnished":"empty"}')).toMatchObject({
      roomType: "Bedroom",
      suggestedTool: "stage",
    });
  });
  it("suggests declutter for a furnished room and sky for an exterior", () => {
    expect(parseDetection('{"roomType":"Kitchen","furnished":"furnished"}').suggestedTool).toBe("declutter");
    expect(parseDetection('```json\n{"exterior":true,"sky":true}\n```')).toMatchObject({ suggestedTool: "sky", roomType: "Outdoor / Patio" });
  });
  it("survives junk", () => {
    expect(parseDetection("no idea")).toMatchObject({ roomType: null, suggestedTool: "stage" });
    expect(parseDetection('{"roomType":"Castle"}').roomType).toBeNull();
  });
});
