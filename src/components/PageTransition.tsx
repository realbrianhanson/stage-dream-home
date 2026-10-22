import { ReactNode } from "react";

/**
 * Route wrapper. The old fade (with AnimatePresence mode="wait") left a blank
 * frame between pages, so routes now swap instantly.
 */
const PageTransition = ({ children }: { children: ReactNode }) => <>{children}</>;

export default PageTransition;
