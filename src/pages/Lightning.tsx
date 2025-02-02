import { ArrowUpFromLine, QrCode, ArrowDownToLine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { Navigation } from "@/components/layout/Navigation";

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

      <Navigation />
    </div>
  );
};

export default Lightning;