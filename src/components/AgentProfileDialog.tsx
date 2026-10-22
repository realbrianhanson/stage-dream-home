import { useState, useEffect, useRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
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

const HEADSHOT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const HEADSHOT_MAX_BYTES = 5 * 1024 * 1024;

const FIELDS = [
  { key: "display_name", label: "Name", placeholder: "Jane Doe", type: "text", autoComplete: "name" },
  { key: "brokerage", label: "Brokerage", placeholder: "Coldwell Banker", type: "text", autoComplete: "organization" },
  { key: "phone", label: "Phone", placeholder: "(555) 123-4567", type: "tel", autoComplete: "tel" },
  { key: "email", label: "Email", placeholder: "jane@example.com", type: "email", autoComplete: "email" },
] as const;

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
      const { data, error } = await supabase
        .from("agent_profiles")
        .select("display_name, brokerage, phone, email, headshot_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Load agent profile failed:", error);
        toast.error("Couldn't load your card. You can still fill it in and save.");
      }
      if (data) setProfile({ ...empty, ...data });
      setLoading(false);
    })();
  }, [user]);

  const setField = <K extends keyof AgentProfile>(key: K, value: AgentProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (!HEADSHOT_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > HEADSHOT_MAX_BYTES) {
      toast.error("That photo is over 5 MB. Choose a smaller one.");
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
      toast.success("Photo uploaded. Save to keep it.");
    } catch (err) {
      console.error("Headshot upload failed:", err);
      toast.error(errorMessage(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const { error } = await supabase.from("agent_profiles").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Contact card saved");
      onClose();
    } catch (err) {
      console.error("Save agent profile failed:", err);
      toast.error(errorMessage(err, "Couldn't save your card. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-soft focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Close
            className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground ${focusRing}`}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          <DialogPrimitive.Title className="pr-8 text-lg font-semibold tracking-tight">Your contact card</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
            Buyers see this on every listing page you share, so they know who to call.
          </DialogPrimitive.Description>

          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your card…
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Headshot</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                    {profile.headshot_url ? (
                      <img src={profile.headshot_url} alt="Your headshot" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-card disabled:opacity-50 ${focusRing}`}
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {uploading ? "Uploading…" : profile.headshot_url ? "Replace photo" : "Upload photo"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={HEADSHOT_TYPES.join(",")}
                    className="hidden"
                    aria-label="Headshot file"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB.</p>
              </div>

              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label htmlFor={`agent-${f.key}`} className="mb-1.5 block text-sm font-medium">
                    {f.label}
                  </label>
                  <input
                    id={`agent-${f.key}`}
                    type={f.type}
                    autoComplete={f.autoComplete}
                    value={profile[f.key] || ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className={`h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70 ${focusRing}`}
                  />
                </div>
              ))}

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className={`inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-card ${focusRing}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className={`gold-gradient-animated inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-60 ${focusRing} focus-visible:ring-offset-2`}
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving…" : "Save card"}
                </button>
              </div>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AgentProfileDialog;
