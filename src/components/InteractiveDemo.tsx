import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import beforeLiving from "@/assets/before-vacant.jpg";
import afterLivingModern from "@/assets/after-staged.jpg";
import beforeBedroom from "@/assets/before-vacant-bedroom.jpg";
import afterBedroomLuxury from "@/assets/showcase-bedroom.jpg";
import beforeKitchen from "@/assets/before-vacant-kitchen.jpg";
import afterKitchenModern from "@/assets/showcase-kitchen.jpg";

type StyleName = "Modern" | "Scandinavian" | "Luxury";

interface DemoRoom {
  id: string;
  label: string;
  thumb: string;
  before: string;
  // Only styles present here are "unlockable" without sign-in.
  staged: Partial<Record<StyleName, string>>;
  defaultStyle: StyleName;
}

const ROOMS: DemoRoom[] = [
  {
    id: "living",
    label: "Living Room",
    thumb: afterLivingModern,
    before: beforeLiving,
    staged: { Modern: afterLivingModern },
    defaultStyle: "Modern",
  },
  {
    id: "bedroom",
    label: "Bedroom",
    thumb: afterBedroomLuxury,
    before: beforeBedroom,
    staged: { Luxury: afterBedroomLuxury },
    defaultStyle: "Luxury",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    thumb: afterKitchenModern,
    before: beforeKitchen,
    staged: { Modern: afterKitchenModern },
    defaultStyle: "Modern",
  },
];

const STYLE_PILLS: StyleName[] = ["Modern", "Scandinavian", "Luxury"];

const InteractiveDemo = () => {
  const [roomId, setRoomId] = useState(ROOMS[0].id);
  const room = ROOMS.find((r) => r.id === roomId) ?? ROOMS[0];
  const [activeStyle, setActiveStyle] = useState<StyleName>(room.defaultStyle);

  const currentAfter = room.staged[activeStyle] ?? room.staged[room.defaultStyle]!;

  const handleRoomChange = (id: string) => {
    setRoomId(id);
    const next = ROOMS.find((r) => r.id === id);
    if (next) setActiveStyle(next.defaultStyle);
  };

  return (
    <div>
      {/* Style pills */}
      <div className="flex items-center justify-center flex-wrap gap-2 mb-5">
        <span className="text-accent font-body text-[11px] tracking-[0.3em] uppercase mr-2">
          Try a style
        </span>
        <TooltipProvider delayDuration={100}>
          {STYLE_PILLS.map((s) => {
            const available = !!room.staged[s];
            const isActive = available && s === activeStyle;
            const pill = (
              <button
                key={s}
                onClick={() => {
                  if (available) setActiveStyle(s);
                }}
                aria-pressed={isActive}
                className={`font-body text-sm px-4 py-1.5 rounded-full border transition-all ${
                  isActive
                    ? "border-accent/40 bg-accent/[0.10] text-accent"
                    : available
                    ? "border-border text-muted-foreground hover:border-accent/40"
                    : "border-border/60 text-muted-foreground/60 cursor-help"
                }`}
              >
                {s}
              </button>
            );
            if (available) return pill;
            return (
              <Tooltip key={s}>
                <TooltipTrigger asChild>{pill}</TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px] text-center">
                  <p className="font-body text-xs mb-1.5">
                    Sign up to try 12 styles
                  </p>
                  <Link
                    to="/auth"
                    className="font-body text-xs text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Start free
                  </Link>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Slider */}
      <BeforeAfterSlider
        key={`${room.id}-${activeStyle}`}
        before={room.before}
        after={currentAfter}
      />

      {/* Room thumbnail tabs */}
      <div className="mt-6 -mx-6 px-6 overflow-x-auto">
        <div className="flex items-center justify-start md:justify-center gap-3 min-w-max mx-auto">
          {ROOMS.map((r) => {
            const isActive = r.id === room.id;
            return (
              <button
                key={r.id}
                onClick={() => handleRoomChange(r.id)}
                aria-pressed={isActive}
                className={`group flex items-center gap-3 pl-2 pr-4 py-2 rounded-xl border transition-all ${
                  isActive
                    ? "border-accent/40 bg-accent/[0.06]"
                    : "border-border hover:border-accent/30"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-lg overflow-hidden border ${
                    isActive ? "border-accent/40" : "border-border"
                  }`}
                >
                  <img
                    src={r.thumb}
                    alt={r.label}
                    width={112}
                    height={112}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span
                  className={`font-body text-sm whitespace-nowrap ${
                    isActive ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversion line */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mt-10 flex flex-col items-center gap-4 text-center"
      >
        <p className="font-display text-2xl md:text-3xl font-medium">
          Your listing could look like this in{" "}
          <span className="italic text-accent">30 seconds</span>
        </p>
        <Link
          to="/auth"
          className="gold-gradient-animated text-accent-foreground font-body font-semibold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity"
        >
          Stage 3 Rooms Free
        </Link>
      </motion.div>
    </div>
  );
};

export default InteractiveDemo;
