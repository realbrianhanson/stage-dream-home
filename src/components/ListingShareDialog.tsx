import { useState, useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Copy, Check, X, Loader2, ExternalLink } from "lucide-react";
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

const COPIED_RESET_MS = 2000;

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
      const { data, error } = await supabase
        .from("listing_pages")
        .select("share_token")
        .eq("user_id", user.id)
        .eq("property_address", propertyAddress)
        .maybeSingle();
      if (error) console.error("Listing link lookup failed:", error);
      if (data?.share_token) {
        setToken(data.share_token);
      } else {
        await createLink();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createLink = async () => {
    if (!user) return;
    setWorking(true);
    const newToken = generateToken();
    const { error } = await supabase
      .from("listing_pages")
      .upsert(
        {
          user_id: user.id,
          property_address: propertyAddress,
          share_token: newToken,
        },
        { onConflict: "user_id,property_address" },
      );
    if (error) {
      console.error("Create listing link failed:", error);
      toast.error("Couldn't create the listing page. Check your connection and try again.");
    } else {
      setToken(newToken);
    }
    setWorking(false);
  };

  const revoke = async () => {
    if (!user) return;
    setWorking(true);
    const { error } = await supabase
      .from("listing_pages")
      .delete()
      .eq("user_id", user.id)
      .eq("property_address", propertyAddress);
    if (error) {
      console.error("Revoke listing link failed:", error);
      toast.error("Couldn't turn off the link. Please try again.");
    } else {
      setToken(null);
      toast.success("Listing page turned off");
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

  const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

          <DialogPrimitive.Title className="pr-8 text-lg font-semibold tracking-tight">
            Share a listing page
          </DialogPrimitive.Title>
          <p className="mt-1 truncate text-sm font-medium text-foreground" title={propertyAddress}>
            {propertyAddress}
          </p>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
            One page with every photo for this property, before and after, plus your contact card. Send it to buyers or
            sellers. You can turn it off at any time.
          </DialogPrimitive.Description>

          <div className="mt-5">
            {loading || (working && !token) ? (
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loading ? "Loading…" : "Creating link…"}
              </div>
            ) : token ? (
              <>
                <label htmlFor="listing-link-url" className="mb-1.5 block text-sm font-medium">
                  Listing page link
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="listing-link-url"
                    readOnly
                    value={url}
                    onFocus={(e) => e.currentTarget.select()}
                    className={`h-10 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm text-foreground ${focusRing}`}
                  />
                  <button
                    type="button"
                    onClick={copy}
                    className={`gold-gradient-animated inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium ${focusRing} focus-visible:ring-offset-2`}
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
                    className={`inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview page
                  </a>
                  <button
                    type="button"
                    onClick={revoke}
                    disabled={working}
                    className={`rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50 ${focusRing}`}
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
                className={`gold-gradient-animated inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-medium disabled:opacity-60 ${focusRing} focus-visible:ring-offset-2`}
              >
                Create listing page
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default ListingShareDialog;
