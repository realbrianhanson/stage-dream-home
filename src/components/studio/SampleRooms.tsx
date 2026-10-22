import { useState } from "react";
import { Loader2 } from "lucide-react";
import archedLiving from "@/assets/sample-arched-living.jpg";
import archedLivingThumb from "@/assets/thumb-sample-arched-living.jpg";
import openLiving from "@/assets/sample-open-living.jpg";
import openLivingThumb from "@/assets/thumb-sample-open-living.jpg";
import bedroom from "@/assets/before-vacant-bedroom.jpg";
import bedroomThumb from "@/assets/thumb-sample-bedroom.jpg";
import kitchen from "@/assets/before-vacant-kitchen.jpg";
import kitchenThumb from "@/assets/thumb-sample-kitchen.jpg";
import livedIn from "@/assets/sample-lived-in-living.jpg";
import livedInThumb from "@/assets/thumb-sample-lived-in-living.jpg";
import exterior from "@/assets/sample-colonial-exterior.jpg";
import exteriorThumb from "@/assets/thumb-sample-colonial-exterior.jpg";

export interface SampleRoom {
  id: string;
  label: string;
  src: string;
  thumb: string;
}

// Free Pexels photos (plus our own empty bedroom and kitchen), chosen so every
// tool has something to work on.
const SAMPLE_ROOMS: SampleRoom[] = [
  { id: "arched-living", label: "Empty living room", src: archedLiving, thumb: archedLivingThumb },
  { id: "open-living", label: "Open-plan living room", src: openLiving, thumb: openLivingThumb },
  { id: "bedroom", label: "Empty bedroom", src: bedroom, thumb: bedroomThumb },
  { id: "kitchen", label: "Empty kitchen", src: kitchen, thumb: kitchenThumb },
  { id: "lived-in", label: "Lived-in living room", src: livedIn, thumb: livedInThumb },
  { id: "exterior", label: "House on a grey day", src: exterior, thumb: exteriorThumb },
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
      <p className="text-sm text-muted-foreground">No photo handy? Try a sample.</p>
      <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-3">
        {SAMPLE_ROOMS.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => pick(room)}
            disabled={loading !== null}
            className="group text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <span className="relative block overflow-hidden rounded-lg border border-border bg-card">
              <img src={room.thumb} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-opacity group-hover:opacity-90" />
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
