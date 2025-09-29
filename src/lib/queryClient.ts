import { QueryClient } from '@tanstack/react-query';

// Create a single instance of the query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Helper function to get the query client instance
export const getQueryClient = () => queryClient;