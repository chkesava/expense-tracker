import { QueryClient } from "@tanstack/react-query";

export const portfolioQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: true,
      staleTime: 60_000,
    },
  },
});
