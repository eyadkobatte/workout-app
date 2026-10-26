import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Bottom sheet sliding up over a dimmed backdrop (PLAN animations). Fully
 * controlled: render `open` and the portal, backdrop and slide animation are
 * handled here.
 */
export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content forceMount asChild aria-describedby={undefined}>
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg rounded-t-lg border border-b-0 border-border bg-card pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
              >
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" aria-hidden />
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
