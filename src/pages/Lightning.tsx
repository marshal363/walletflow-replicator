import { ArrowUpFromLine, QrCode, ArrowDownToLine, Home, Wallet, Zap, Bell, Navigation as NavigationIcon, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";

const Lightning = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex justify-between p-4">
        <Avatar className="h-10 w-10" />
        <div className="h-10 w-10 rounded-full flex items-center justify-center">
          <ArrowUpFromLine className="h-5 w-5" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center pt-8">
        <h1 className="text-7xl font-bold mb-1">0</h1>
        <p className="text-lg text-muted-foreground">sats</p>
      </div>

      <div className="flex-1 flex items-center justify-center pb-20">
        <div className="grid grid-cols-3 gap-12 px-8">
          <button
            onClick={() => navigate("/send")}
            className="flex flex-col items-center space-y-2"
          >
            <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <ArrowUpFromLine className="h-8 w-8" />
            </div>
            <span className="text-sm">SEND</span>
          </button>
          <button className="flex flex-col items-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <QrCode className="h-8 w-8" />
            </div>
            <span className="text-sm">SCAN</span>
          </button>
          <button className="flex flex-col items-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <ArrowDownToLine className="h-8 w-8" />
            </div>
            <span className="text-sm">RECEIVE</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black pb-6 pt-2 px-8 border-t border-gray-800">
        <div className="flex justify-between items-center w-full max-w-md mx-auto relative">
          <div className="flex justify-between w-full">
            <button 
              onClick={() => navigate("/")}
              className="flex flex-col items-center text-gray-500 w-12"
            >
              <Home className="h-6 w-6" />
            </button>
            <button 
              onClick={() => navigate("/wallet")}
              className="flex flex-col items-center text-gray-500 w-12"
            >
              <Wallet className="h-6 w-6" />
            </button>
            <div className="w-12"></div> {/* Spacer for center button */}
            <button 
              onClick={() => navigate("/messages")}
              className="flex flex-col items-center text-gray-500 w-12"
            >
              <Mail className="h-6 w-6" />
            </button>
            <button className="flex flex-col items-center text-gray-500 w-12">
              <Bell className="h-6 w-6" />
            </button>
          </div>
          
          {/* Center prominent button */}
          <button 
            className="absolute left-1/2 -translate-x-1/2 -translate-y-6 h-14 w-14 rounded-full bg-white flex items-center justify-center"
          >
            <Zap className="h-7 w-7 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lightning;