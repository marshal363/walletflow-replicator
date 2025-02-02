import { Home, Wallet, Zap, Bell, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t pb-6 pt-2">
      <div className="flex justify-between items-center w-full max-w-md mx-auto px-8 relative">
        <div className="flex justify-between w-full">
          <button 
            onClick={() => navigate("/")}
            className={`flex flex-col items-center w-12 ${
              location.pathname === "/" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Home className="h-6 w-6" />
          </button>
          <button 
            onClick={() => navigate("/wallet")}
            className={`flex flex-col items-center w-12 ${
              location.pathname === "/wallet" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Wallet className="h-6 w-6" />
          </button>
          <div className="w-12" /> {/* Spacer for center button */}
          <button 
            onClick={() => navigate("/messages")}
            className={`flex flex-col items-center w-12 ${
              location.pathname === "/messages" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Mail className="h-6 w-6" />
          </button>
          <button 
            onClick={() => navigate("/notifications")}
            className={`flex flex-col items-center w-12 ${
              location.pathname === "/notifications" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Bell className="h-6 w-6" />
          </button>
        </div>
        
        {/* Center prominent Lightning button */}
        <button 
          onClick={() => navigate("/lightning")}
          className={`absolute left-1/2 -translate-x-1/2 -translate-y-6 h-14 w-14 rounded-full 
            ${location.pathname === "/lightning" ? "bg-primary text-white" : "bg-white text-black"}
            flex items-center justify-center`}
        >
          <Zap className="h-7 w-7" />
        </button>
      </div>
    </nav>
  );
} 