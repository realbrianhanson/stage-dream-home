import { useState } from "react";
import { Loader2 } from "lucide-react";
import beforeLiving from "@/assets/before-vacant.jpg";
import beforeBedroom from "@/assets/before-vacant-bedroom.jpg";
import beforeKitchen from "@/assets/before-vacant-kitchen.jpg";

export interface SampleRoom {
  id: string;
  label: string;
  src: string;
}

const SAMPLE_ROOMS: SampleRoom[] = [
  { id: "living", label: "Empty living room", src: beforeLiving },
  { id: "bedroom", label: "Empty bedroom", src: beforeBedroom },
  { id: "kitchen", label: "Empty kitchen", src: beforeKitchen },
];

interface SampleRoomsProps {
  onPick: (file: File) => void | Promise<void>;
}

/** Lets someone try the studio without a photo of their own. */
const SampleRooms = ({ onPick }: SampleRoomsProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const pick = async (room: SampleRoom) => {
    setLoading(room.id);
    try {
      const res = await fetch(room.src);
      const blob = await res.blob();
      await onPick(new File([blob], `sample-${room.id}.jpg`, { type: blob.type || "image/jpeg" }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">No photo handy? Try a sample room.</p>
      <div className="mt-3 grid grid-cols-3 gap-3 max-w-xl">
        {SAMPLE_ROOMS.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => pick(room)}
            disabled={loading !== null}
            className="group text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <span className="relative block overflow-hidden rounded-lg border border-border bg-card">
              <img src={room.src} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-opacity group-hover:opacity-90" />
              {loading === room.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/70">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                </span>
              )}
            </span>
            <span className="mt-1.5 block text-xs text-foreground">{room.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SampleRooms;
