import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Loader2, User, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AgentProfile {
  display_name: string | null;
  brokerage: string | null;
  phone: string | null;
  email: string | null;
  headshot_url: string | null;
}

interface Props {
  onClose: () => void;
}

const empty: AgentProfile = {
  display_name: "",
  brokerage: "",
  phone: "",
  email: "",
  headshot_url: "",
};

const AgentProfileDialog = ({ onClose }: Props) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AgentProfile>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("agent_profiles" as any)
        .select("display_name, brokerage, phone, email, headshot_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setProfile({ ...empty, ...(data as any) });
      setLoading(false);
    })();
  }, [user]);

  const setField = <K extends keyof AgentProfile>(key: K, value: AgentProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Headshot must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/profile/headshot-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("stagings")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("stagings").getPublicUrl(path);
      setField("headshot_url", urlData.publicUrl);
      toast.success("Headshot uploaded");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        display_name: profile.display_name?.trim() || null,
        brokerage: profile.brokerage?.trim() || null,
        phone: profile.phone?.trim() || null,
        email: profile.email?.trim() || null,
        headshot_url: profile.headshot_url?.trim() || null,
      };
      const { error } = await supabase
        .from("agent_profiles" as any)
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Card saved");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-foreground/70 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-2xl p-8 max-w-md w-full relative max-h-[92vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
          <User className="w-5 h-5 text-accent" />
        </div>

        <h3 className="font-display text-2xl font-medium mb-1">Your Card</h3>
        <p className="font-body text-sm text-muted-foreground mb-6">
          Appears on every listing microsite you share.
        </p>

        {loading ? (
          <div className="flex items-center gap-3 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span className="font-body text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Headshot */}
            <div>
              <label className="font-body text-xs font-medium text-muted-foreground block mb-2 tracking-wide uppercase">
                Headshot
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0">
                  {profile.headshot_url ? (
                    <img
                      src={profile.headshot_url}
                      alt="Headshot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="font-body text-xs border border-border hover:border-accent/40 rounded-lg px-3 py-2 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  {uploading ? "Uploading…" : profile.headshot_url ? "Replace" : "Upload"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {(
              [
                { key: "display_name", label: "Name", placeholder: "Jane Doe" },
                { key: "brokerage", label: "Brokerage", placeholder: "Coldwell Banker" },
                { key: "phone", label: "Phone", placeholder: "(555) 123-4567" },
                { key: "email", label: "Email", placeholder: "jane@example.com" },
              ] as const
            ).map((f) => (
              <div key={f.key}>
                <label className="font-body text-xs font-medium text-muted-foreground block mb-1.5 tracking-wide uppercase">
                  {f.label}
                </label>
                <input
                  type={f.key === "email" ? "email" : f.key === "phone" ? "tel" : "text"}
                  value={profile[f.key] || ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full font-body text-sm bg-white/[0.02] border border-white/[0.08] rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            ))}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full gold-gradient-animated text-accent-foreground font-body font-semibold text-sm py-3 rounded-lg tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default AgentProfileDialog;
