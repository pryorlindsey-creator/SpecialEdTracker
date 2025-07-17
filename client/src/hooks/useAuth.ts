import { useEffect, useState } from "react";

export function useAuth() {
  const [authState, setAuthState] = useState({ user: null, isLoading: true, isAuthenticated: false });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("Checking authentication status...");
        const response = await fetch("/api/auth/user", {
          credentials: "include",
          cache: "no-store"
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log("Auth check successful - user data:", userData);
          setAuthState({ user: userData, isLoading: false, isAuthenticated: true });
        } else {
          console.log("Auth check failed - status:", response.status);
          // Set as unauthenticated to show landing page
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.log("Auth check error:", error);
        // Set as unauthenticated to show landing page
        setAuthState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    // Initial check only, no polling to reduce network overhead
    checkAuth();
  }, []);

  return authState;
}
