// Turns the vision model's JSON into a safe room suggestion. Pure for tests.
import { isKnownRoomType, type RoomType } from "./catalog.ts";
import type { ToolId } from "./tools.ts";

export interface Detection {
  roomType: RoomType | null;
  exterior: boolean;
  furnished: "empty" | "partly" | "furnished" | null;
  suggestedTool: ToolId;
}

export function parseDetection(content: unknown): Detection {
  let raw: Record<string, unknown> = {};
  if (typeof content === "string") {
    const match = content.match(/\{[\s\S]*\}/);
    try {
      raw = match ? JSON.parse(match[0]) : {};
    } catch {
      raw = {};
    }
  }
  const exterior = raw.exterior === true;
  const furnished = raw.furnished === "empty" || raw.furnished === "partly" || raw.furnished === "furnished" ? raw.furnished : null;
  const roomType = typeof raw.roomType === "string" && isKnownRoomType(raw.roomType) ? raw.roomType : null;

  let suggestedTool: ToolId = "stage";
  if (exterior) suggestedTool = raw.sky === true ? "sky" : "lawn";
  else if (furnished === "furnished") suggestedTool = "declutter";

  return { roomType: exterior ? "Outdoor / Patio" : roomType, exterior, furnished, suggestedTool };
}
