import type { ReactElement } from "react";
import * as Primitive from "@radix-ui/react-tooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
/** Nonmodal, portal-backed hints also work when the same toolbar is outside the dashboard. */
export default function IconHint({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <Primitive.Portal>
          <TooltipContent
            side="bottom"
            sideOffset={8}
            collisionPadding={8}
            className="z-[80] max-w-[min(20rem,calc(100vw-1.5rem))] border-violet-400/25 bg-[#151b30] px-3 py-2 text-xs leading-relaxed text-slate-100 shadow-xl"
          >
            {label}
          </TooltipContent>
        </Primitive.Portal>
      </Tooltip>
    </TooltipProvider>
  );
}
