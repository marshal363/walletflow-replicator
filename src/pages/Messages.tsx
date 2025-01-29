import React from "react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { Search, Send, QrCode, Split } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ArrowUpFromLine, QrCode as QrCodeIcon, ArrowDownToLine, Home, Wallet, Zap, Bell, Navigation as NavigationIcon, Mail } from "lucide-react";

// Mock data - Replace with real data later
const messages = [
  {
    id: 1,
    sender: "Alice Smith",
    username: "@alice",
    avatar: "AS",
    lastMessage: "Thanks for the coffee! 😊",
    timestamp: "12:31 PM",
    unread: true,
    isOnline: true,
    lastPayment: {
      type: 'sent',
      amount: '0.0005',
      fiatAmount: '20.50'
    }
  },
  {
    id: 2,
    sender: "Raoul B",
    username: "@ogdivin",
    avatar: "RB",
    lastMessage: "You sent",
    timestamp: "10:38 AM",
    unread: false,
    isOnline: false,
    lastPayment: {
      type: 'sent',
      amount: '0.0003',
      fiatAmount: '12.25'
    }
  },
  {
    id: 3,
    sender: "Manuel Marques",
    username: "@manuel",
    avatar: "MM",
    lastMessage: "No messages yet",
    timestamp: "Yesterday",
    unread: false,
    isOnline: true,
    lastPayment: null
  }
];

const Messages = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Header title="Messages" showBack={false} />
      
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search messages"
            className="pl-10 bg-zinc-900 border-none rounded-full"
          />
        </div>
      </div>

      <div className="flex-1 divide-y divide-zinc-800/50">
        {messages.map((message) => (
          <button
            key={message.id}
            onClick={() => navigate(`/messages/${message.id}`)}
            className="w-full p-4 flex items-center space-x-4 hover:bg-zinc-900/50 transition-colors"
          >
            <div className="relative">
              <Avatar className="h-12 w-12 bg-blue-600 flex items-center justify-center text-lg font-medium">
                <span>{message.avatar}</span>
              </Avatar>
              {message.isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h3 className="font-medium text-white">{message.sender}</h3>
                  <p className="text-sm text-zinc-400">{message.username}</p>
                </div>
                <span className="text-xs text-zinc-400 flex-shrink-0">
                  {message.timestamp}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-sm text-zinc-400 truncate pr-4">
                  {message.lastPayment ? (
                    <span className="flex items-center gap-1">
                      <span>{message.lastMessage}</span>
                      {message.lastPayment.type === 'sent' && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                          {message.lastPayment.amount} BTC
                        </span>
                      )}
                    </span>
                  ) : (
                    message.lastMessage
                  )}
                </p>
                {message.unread && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Action Buttons */}
      <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center gap-4">
        <button className="flex-1 bg-zinc-900 text-white rounded-full py-3 px-4 font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 max-w-[120px]">
          <Send className="h-5 w-5" />
          <span>Send</span>
        </button>
        <button className="flex-1 bg-zinc-900 text-white rounded-full py-3 px-4 font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 max-w-[120px]">
          <QrCodeIcon className="h-5 w-5" />
          <span>Request</span>
        </button>
        <button className="flex-1 bg-zinc-900 text-white rounded-full py-3 px-4 font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 max-w-[120px]">
          <Split className="h-5 w-5" />
          <span>Split</span>
        </button>
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
              className="flex flex-col items-center text-white w-12"
            >
              <Mail className="h-6 w-6" />
            </button>
            <button className="flex flex-col items-center text-gray-500 w-12">
              <Bell className="h-6 w-6" />
            </button>
          </div>
          
          {/* Center prominent button */}
          <button 
            onClick={() => navigate("/lightning")}
            className="absolute left-1/2 -translate-x-1/2 -translate-y-6 h-14 w-14 rounded-full bg-white flex items-center justify-center"
          >
            <Zap className="h-7 w-7 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;