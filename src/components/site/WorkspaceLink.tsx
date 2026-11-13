import { useRef, forwardRef } from "react";
import { Link, useNavigate, type LinkProps } from "react-router-dom";
import { toast } from "sonner";
import { flushDocumentEditors } from "@/features/documents/navigation";
import { flushServicePageEdits } from "@/lib/servicePageNavigation";

/** The upbar must honor the same save guards as the dashboard sidebar. */
const WorkspaceLink = forwardRef<
  HTMLAnchorElement,
  Omit<LinkProps, "onClick"> & { onNavigate?: () => void }
>(function WorkspaceLink({ to, onNavigate, ...props }, ref) {
  const navigate = useNavigate(),
    busy = useRef(false);
  return (
    <Link
      ref={ref}
      {...props}
      to={to}
      onClick={async (e) => {
        if (
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          (props.target && props.target !== "_self")
        )
          return;
        e.preventDefault();
        if (busy.current) return;
        busy.current = true;
        try {
          if (
            !(await flushDocumentEditors()) ||
            !(await flushServicePageEdits())
          ) {
            toast.error(
              "Navigarea a fost oprită. Verifică salvarea modificărilor înainte de a continua.",
            );
            return;
          }
          onNavigate?.();
          if (typeof to === "string" && /^https?:\/\//i.test(to)) {
            if (props.replace) window.location.replace(to);
            else window.location.assign(to);
          } else {
            navigate(to, {
              replace: props.replace,
              state: props.state,
              relative: props.relative,
              preventScrollReset: props.preventScrollReset,
            });
          }
        } catch {
          toast.error(
            "Modificările nu au putut fi salvate. Reîncearcă înainte de a continua.",
          );
        } finally {
          busy.current = false;
        }
      }}
    />
  );
});
export default WorkspaceLink;
