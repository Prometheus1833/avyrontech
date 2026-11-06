import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ServiceContentPreviewStatus from "./ServiceContentPreviewStatus";
/** Loaded with service routes, leaving the public homepage's critical bundle intact. */
export default function ServiceContentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ServiceContentPreviewStatus />
      {children}
    </QueryClientProvider>
  );
}
