import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, List, QrCode, Keyboard } from "lucide-react";
import { useNavigate } from "react-router-dom";

const recipients = [
  { id: 1, name: "jack", email: "jack@primal.net", followers: "247k" },
  { id: 2, name: "LynAlden", email: "lyn@primal.net", followers: "80k" },
  { id: 3, name: "calle", email: "calle@npub.cash", followers: "47k" },
  // Add more recipients as needed
];

const Send = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Nostr Recipient" />
      
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users"
            className="pl-10 bg-secondary border-none"
          />
        </div>
      </div>

      <div className="flex-1">
        {recipients.map((recipient) => (
          <button
            key={recipient.id}
            onClick={() => navigate(`/amount/${recipient.id}`)}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/50"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 avatar-ring" />
              <div className="text-left">
                <h3 className="font-medium">{recipient.name}</h3>
                <p className="text-sm text-muted-foreground">{recipient.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{recipient.followers}</p>
              <p className="text-xs text-muted-foreground">followers</p>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Navigation Icons */}
      <div className="fixed bottom-0 left-0 right-0 pb-8 pt-2 bg-background border-t border-border">
        <div className="flex justify-center space-x-16">
          <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-white">
            <List className="h-6 w-6 text-black" />
          </button>
          <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-zinc-800">
            <QrCode className="h-6 w-6" />
          </button>
          <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-zinc-800">
            <Keyboard className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Send;