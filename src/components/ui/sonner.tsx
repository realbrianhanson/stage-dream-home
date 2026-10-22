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
            "group toast font-body rounded-lg border px-4 py-3 shadow-elevated " +
            "group-[.toaster]:bg-background group-[.toaster]:text-foreground " +
            "group-[.toaster]:border-border",
          title: "text-sm font-medium",
          description: "group-[.toast]:text-muted-foreground text-[13px] mt-0.5",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-accent-foreground group-[.toast]:font-body " +
            "group-[.toast]:text-xs group-[.toast]:font-semibold group-[.toast]:rounded-md " +
            "group-[.toast]:px-3 group-[.toast]:py-1.5",
          cancelButton:
            "group-[.toast]:bg-card group-[.toast]:text-muted-foreground " +
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
