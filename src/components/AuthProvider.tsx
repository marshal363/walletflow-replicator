import { useAuth, useClerk } from "@clerk/clerk-react";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"];

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle sign-out
  useEffect(() => {
    const unsubscribe = clerk.addListener(({ user }) => {
      // If user becomes null, it means they've signed out
      if (!user) {
        navigate("/sign-in", { replace: true });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [clerk, navigate]);

  // Effect for handling initial load and auth state changes
  useEffect(() => {
    const checkAuthAndRedirect = () => {
      if (!isLoaded) return;

      const isPublicPath = PUBLIC_PATHS.some(path => 
        location.pathname.startsWith(path)
      );

      // If user is not signed in and trying to access protected route
      if (!isSignedIn && !isPublicPath) {
        navigate("/sign-in", { replace: true });
        return;
      }

      // If user is signed in and on auth pages, redirect to home
      if (isSignedIn && (location.pathname === "/sign-in" || location.pathname === "/sign-up")) {
        navigate("/", { replace: true });
      }
    };

    // Check auth state immediately
    checkAuthAndRedirect();

    // Add event listener for page visibility changes (tab focus)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAuthAndRedirect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isLoaded, isSignedIn, location.pathname, navigate, userId]);

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthProvider; 