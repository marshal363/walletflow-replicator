import { Button } from "@/components/ui/button";
import { Send, QrCode, Split, ArrowLeft, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { MessageInput } from "./MessageInput";

interface ActionBarProps {
  onSend: (message: string) => void;
  onSendClick: () => void;
  onRequestClick: () => void;
  onSplitClick: () => void;
  isSending?: boolean;
  messageValue?: string;
  onMessageChange?: (value: string) => void;
  recipientUsername?: string;
}

export function ActionBar({
  onSend,
  onSendClick,
  onRequestClick,
  onSplitClick,
  isSending,
  messageValue = "",
  onMessageChange,
  recipientUsername
}: ActionBarProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      {/* Expandable Actions Panel */}
      <div
        className={cn(
          "absolute bottom-full left-0 right-0 bg-[#1d1d1d] rounded-t-xl transition-all duration-200 ease-in-out border-t border-zinc-800/50",
          showActions ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        )}
      >
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              className="flex-1 bg-[#0066FF] hover:bg-[#0052CC] text-white h-10 rounded-lg"
              onClick={onSendClick}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
            <Button
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white h-10 rounded-lg"
              onClick={onRequestClick}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Request
            </Button>
            <Button
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white h-10 rounded-lg"
              onClick={onSplitClick}
            >
              <Split className="h-4 w-4 mr-2" />
              Split
            </Button>
          </div>
        </div>
      </div>

      {/* Main Input Bar */}
      <div className="bg-black/40 backdrop-blur-md border-t border-zinc-800/50 p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 transition-all duration-200",
              showActions && "bg-zinc-700"
            )}
            onClick={() => setShowActions(!showActions)}
          >
            <ChevronUp
              className={cn(
                "h-4 w-4 text-white transition-transform duration-200",
                showActions && "rotate-180"
              )}
            />
          </Button>

          <div className="flex-1">
            <MessageInput
              value={messageValue}
              onChange={onMessageChange}
              onSubmit={onSend}
              placeholder={`Message ${recipientUsername}`}
              disabled={isSending}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 