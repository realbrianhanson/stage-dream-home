// Dev-only page to review the studio UI without signing in. Never routed in
// production builds (see AnimatedRoutes).
import { useState } from "react";
import RoomUploader from "@/components/RoomUploader";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import beforeImg from "@/assets/before-vacant.jpg";
import afterImg from "@/assets/after-staged.jpg";

const DevStudio = () => {
  const [plan, setPlan] = useState("admin");
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 flex gap-2 text-sm">
        {["free", "pro", "admin"].map((p) => (
          <button key={p} onClick={() => setPlan(p)} className={`px-3 h-8 rounded-md border ${plan === p ? "border-accent text-accent" : "border-border"}`}>
            {p}
          </button>
        ))}
      </div>
      <RoomUploader
        key={plan}
        onResult={() => {}}
        onMultiStart={() => {}}
        onMultiProgress={() => {}}
        initialImage={beforeImg}
        canStage
        remainingStagings={plan === "free" ? 2 : 287}
        onStagingComplete={async () => {}}
        usage={{ plan, stagings_this_month: 1 }}
        freeLimit={3}
      />
      <div className="pb-20">
        <BeforeAfterSlider before={beforeImg} after={afterImg} refineContext={{ stagingId: "x", roomType: "Living Room", style: "Modern" }} />
      </div>
    </div>
  );
};

export default DevStudio;
