import { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Copy, Check, X, Loader2, ExternalLink } from "lucide-react";
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

const COPIED_RESET_MS = 2000;

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
      console.error("Create share link failed:", error);
      toast.error("Couldn't create the link. Check your connection and try again.");
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
      console.error("Revoke share link failed:", error);
      toast.error("Couldn't turn off the link. Please try again.");
    } else {
      setToken(null);
      onTokenChange(null);
      toast.success("Link turned off. Anyone who has it now sees a not-found page.");
    }
    setWorking(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it by hand.");
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-background p-6 shadow-soft focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Close
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </DialogPrimitive.Close>

          <DialogPrimitive.Title className="pr-8 text-lg font-semibold tracking-tight">
            Share this before and after
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
            Anyone with the link can view it. No account needed. You can turn the link off at any time.
          </DialogPrimitive.Description>

          <div className="mt-5">
            {working && !token ? (
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating link…
              </div>
            ) : token ? (
              <>
                <label htmlFor="share-link-url" className="mb-1.5 block text-sm font-medium">
                  Public link
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="share-link-url"
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={copy}
                    className="gold-gradient-animated inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy link"}
                  </button>
                </div>
                <p aria-live="polite" className="sr-only">
                  {copied ? "Link copied to clipboard" : ""}
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open page
                  </a>
                  <button
                    type="button"
                    onClick={revokeLink}
                    disabled={working}
                    className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    Turn off link
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={createLink}
                disabled={working}
                className="gold-gradient-animated inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
              >
                Create a new link
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ShareDialog;
