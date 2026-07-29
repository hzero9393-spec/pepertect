import { QueryClient } from '@tanstack/react-query';

// Create a single shared QueryClient instance for the app.
// - staleTime: 15s — data is considered fresh for 15s, so navigating
//   between pages won't trigger a duplicate fetch if you return within 15s.
// - gcTime: 5min — unused data stays in cache for 5 minutes before garbage collection.
// - refetchOnWindowFocus: false — avoids refetches when user tabs away and back.
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15 * 1000,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new client so requests are isolated
    return makeQueryClient();
  }
  // Browser: reuse the same client across renders
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
