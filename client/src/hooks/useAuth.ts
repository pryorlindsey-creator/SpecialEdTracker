import { useEffect, useState } from "react";

export function useAuth() {
  const [authState, setAuthState] = useState({ user: null, isLoading: true, isAuthenticated: false });

  useEffect(() => {
    let intervalId: number;

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
          setAuthState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch (error) {
        console.log("Auth check error:", error);
        setAuthState({ user: null, isLoading: false, isAuthenticated: false });
      }
    };

    // Initial check
    checkAuth();

    // Set up polling every 2 seconds
    intervalId = window.setInterval(checkAuth, 2000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  return authState;
}
