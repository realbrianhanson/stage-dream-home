import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      className="toaster group"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            "group toast font-body backdrop-blur-xl rounded-xl border px-4 py-3.5 shadow-[0_20px_60px_-15px_hsl(220_20%_8%/0.5)] " +
            "group-[.toaster]:bg-foreground/95 group-[.toaster]:text-primary-foreground " +
            "group-[.toaster]:border-accent/15",
          title: "font-display text-[15px] tracking-tight font-medium",
          description: "group-[.toast]:text-primary-foreground/65 text-[13px] mt-0.5",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-accent-foreground group-[.toast]:font-body " +
            "group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:rounded-md " +
            "group-[.toast]:tracking-wide group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-white/5 group-[.toast]:text-primary-foreground/70 " +
            "group-[.toast]:font-body group-[.toast]:text-xs group-[.toast]:rounded-md " +
            "group-[.toast]:px-3 group-[.toast]:py-1.5",
          success: "group-[.toaster]:border-l-2 group-[.toaster]:border-l-accent",
          error: "group-[.toaster]:border-l-2 group-[.toaster]:border-l-destructive",
          info: "group-[.toaster]:border-l-2 group-[.toaster]:border-l-accent/60",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
