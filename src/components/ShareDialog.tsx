import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Link2, X, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShareDialogProps {
  stagingId: string;
  initialToken: string | null;
  onClose: () => void;
  onTokenChange: (token: string | null) => void;
}

const generateToken = () => {
  // 22-char URL-safe random token
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

const ShareDialog = ({ stagingId, initialToken, onClose, onTokenChange }: ShareDialogProps) => {
  const [token, setToken] = useState<string | null>(initialToken);
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = token ? `${window.location.origin}/share/${token}` : "";

  useEffect(() => {
    // Auto-create a link if one doesn't exist yet
    if (!token) {
      void createLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createLink = async () => {
    setWorking(true);
    const newToken = generateToken();
    const { error } = await supabase
      .from("stagings")
      .update({ share_token: newToken })
      .eq("id", stagingId);
    if (error) {
      toast.error("Failed to create share link");
    } else {
      setToken(newToken);
      onTokenChange(newToken);
    }
    setWorking(false);
  };

  const revokeLink = async () => {
    setWorking(true);
    const { error } = await supabase
      .from("stagings")
      .update({ share_token: null })
      .eq("id", stagingId);
    if (error) {
      toast.error("Failed to revoke link");
    } else {
      setToken(null);
      onTokenChange(null);
      toast.success("Share link revoked");
    }
    setWorking(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
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
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-4">
          <Link2 className="w-5 h-5 text-accent" />
        </div>

        <h3 className="font-display text-2xl font-medium mb-2">Share this staging</h3>
        <p className="font-body text-sm text-muted-foreground mb-6">
          Anyone with the link can view this before/after — no account needed. Revoke anytime.
        </p>

        {working && !token ? (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span className="font-body text-sm text-muted-foreground">Generating link...</span>
          </div>
        ) : token ? (
          <>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card/50 mb-4">
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
              onClick={revokeLink}
              disabled={working}
              className="w-full font-body text-xs text-muted-foreground hover:text-destructive flex items-center justify-center gap-1.5 py-2 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              Revoke link
            </button>
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
};

export default ShareDialog;
