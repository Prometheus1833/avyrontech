import { Suspense, useState, useRef } from "react";
import { MessagesSquare } from "lucide-react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import "./staffHeader.css";
const Panels = lazyWithRetry(() => import("./StaffQuickPanels"));
export default function ClientChatButton() {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={trigger}
        className="staff-header-action"
        aria-label="Deschide mesaje proiecte"
        title="Mesaje proiecte"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <MessagesSquare size={18} />
      </button>
      {open && (
        <Suspense fallback={null}>
          <Panels
            panel="chat"
            onClose={() => setOpen(false)}
            returnFocus={() => trigger.current?.focus()}
          />
        </Suspense>
      )}
    </>
  );
}
