import { Home, Wallet, Zap, Bell, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Function to check if modal is open
    const checkModalState = () => {
      setIsModalOpen(document.body.getAttribute('data-modal-open') === 'true');
    };

    // Initial check
    checkModalState();

    // Create observer to watch for attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-modal-open') {
          checkModalState();
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-modal-open']
    });

    // Cleanup
    return () => observer.disconnect();
  }, []);

  if (isModalOpen) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent" />
      <div className="relative z-10 border-t border-zinc-800/50 bg-black/40 backdrop-blur-md pb-6 pt-2">
        <div className="flex justify-between items-center w-full max-w-md mx-auto px-8 relative">
          <div className="flex justify-between w-full">
            <button 
              onClick={() => navigate("/")}
              className={cn(
                "flex flex-col items-center w-12",
                location.pathname === "/" ? "text-white" : "text-zinc-500"
              )}
            >
              <Home className="h-6 w-6" />
            </button>
            <button 
              onClick={() => navigate("/wallet")}
              className={cn(
                "flex flex-col items-center w-12",
                location.pathname === "/wallet" ? "text-white" : "text-zinc-500"
              )}
            >
              <Wallet className="h-6 w-6" />
            </button>
            <div className="w-12" /> {/* Spacer for center button */}
            <button 
              onClick={() => navigate("/messages")}
              className={cn(
                "flex flex-col items-center w-12",
                location.pathname === "/messages" ? "text-white" : "text-zinc-500"
              )}
            >
              <Mail className="h-6 w-6" />
            </button>
            <button 
              onClick={() => navigate("/notifications")}
              className={cn(
                "flex flex-col items-center w-12",
                location.pathname === "/notifications" ? "text-white" : "text-zinc-500"
              )}
            >
              <Bell className="h-6 w-6" />
            </button>
          </div>
          
          {/* Center prominent Lightning button */}
          <button 
            onClick={() => navigate("/lightning")}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 -translate-y-6 h-14 w-14 rounded-full flex items-center justify-center",
              location.pathname === "/lightning" 
                ? "bg-[#0066FF] text-white hover:bg-[#0052CC]" 
                : "bg-white text-black hover:bg-zinc-200",
              "transition-colors"
            )}
          >
            <Zap className="h-7 w-7" />
          </button>
        </div>
      </div>
    </nav>
  );
} 