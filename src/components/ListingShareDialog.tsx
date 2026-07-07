import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Link2, X, Loader2, Trash2, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  propertyAddress: string;
  onClose: () => void;
}

const generateToken = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const ListingShareDialog = ({ propertyAddress, onClose }: Props) => {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = token ? `${window.location.origin}/listing/${token}` : "";

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Look up an existing listing_pages row for this owner+address.
      const { data } = await supabase
        .from("listing_pages" as any)
        .select("share_token")
        .eq("user_id", user.id)
        .eq("property_address", propertyAddress)
        .maybeSingle();
      if (data && (data as any).share_token) {
        setToken((data as any).share_token);
        setLoading(false);
      } else {
        // Create it.
        await createLink();
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createLink = async () => {
    if (!user) return;
    setWorking(true);
    const newToken = generateToken();
    const { error } = await supabase
      .from("listing_pages" as any)
      .upsert(
        {
          user_id: user.id,
          property_address: propertyAddress,
          share_token: newToken,
        },
        { onConflict: "user_id,property_address" }
      );
    if (error) {
      console.error(error);
      toast.error("Failed to create listing link");
    } else {
      setToken(newToken);
    }
    setWorking(false);
  };

  const revoke = async () => {
    if (!user) return;
    setWorking(true);
    const { error } = await supabase
      .from("listing_pages" as any)
      .delete()
      .eq("user_id", user.id)
      .eq("property_address", propertyAddress);
    if (error) {
      toast.error("Failed to revoke link");
    } else {
      setToken(null);
      toast.success("Listing link revoked");
    }
    setWorking(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Listing link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
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
        className="bg-background border border-border rounded-2xl p-8 max-w-md w-full relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
          <Home className="w-5 h-5 text-accent" />
        </div>

        <h3 className="font-display text-2xl font-medium mb-1">Share this listing</h3>
        <p className="font-body text-sm text-muted-foreground mb-1">
          {propertyAddress}
        </p>
        <p className="font-body text-xs text-muted-foreground/70 mb-6">
          A branded microsite with every staged room and your agent card. Revoke anytime.
        </p>

        {loading || (working && !token) ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span className="font-body text-sm text-muted-foreground">
              {loading ? "Loading…" : "Generating link…"}
            </span>
          </div>
        ) : token ? (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card/50 mb-4">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 bg-transparent font-body text-xs text-foreground/80 outline-none truncate"
              />
              <button
                onClick={copy}
                className="flex-shrink-0 gold-gradient text-accent-foreground font-body text-xs font-semibold px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              onClick={revoke}
              disabled={working}
              className="w-full font-body text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5 py-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              Revoke link
            </button>
          </>
        ) : (
          <button
            onClick={createLink}
            disabled={working}
            className="w-full gold-gradient-animated text-accent-foreground font-body font-semibold text-sm py-3 rounded-lg tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            Create link
          </button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ListingShareDialog;
