import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ToolId } from "@/config/tools";

export interface RoomDetection {
  roomType: string | null;
  exterior: boolean;
  furnished: "empty" | "partly" | "furnished" | null;
  suggestedTool: ToolId;
}

/** Ask the server what's in an uploaded photo. Silent on failure: it's a hint. */
export function useRoomDetection(originalUrl: string | null) {
  const [detection, setDetection] = useState<RoomDetection | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setDetection(null);
    if (!originalUrl?.startsWith("http")) return;
    let cancelled = false;
    setDetecting(true);
    supabase.functions
      .invoke("detect-room", { body: { originalUrl } })
      .then(({ data, error }) => {
        if (!cancelled && !error && data) setDetection(data as RoomDetection);
      })
      .finally(() => {
        if (!cancelled) setDetecting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [originalUrl]);

  return { detection, detecting };
}
