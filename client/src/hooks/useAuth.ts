import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to ensure fresh auth state
    refetchInterval: 2000, // Poll every 2 seconds to catch auth changes
  });

  console.log("useAuth - user:", !!user, "isLoading:", isLoading, "error:", !!error);
  
  // Additional debug info
  if (error) {
    console.log("useAuth - error details:", error);
  }
  if (user) {
    console.log("useAuth - user data:", user);
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
