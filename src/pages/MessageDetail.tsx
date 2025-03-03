import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Avatar } from "@/components/ui/avatar";
import { ArrowLeft, Send, Zap, QrCode, Split } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface Message {
  id: number;
  type: 'text' | 'payment' | 'payment_request';
  content: string;
  sender: 'me' | 'them';
  timestamp: string;
  paymentData?: {
    type: 'send' | 'request';
    amount: string;
    fiatAmount: string;
    status?: 'pending' | 'completed' | 'failed';
  };
}

const messages: Message[] = [
  {
    id: 1,
    type: 'payment_request',
    content: 'Payment Request',
    sender: 'them',
    timestamp: '12:30 PM',
    paymentData: {
      type: 'request',
      amount: '0.0005',
      fiatAmount: '20.50',
      status: 'pending'
    }
  },
  {
    id: 2,
    type: 'text',
    content: "Thanks for the coffee! 😊",
    sender: 'them',
    timestamp: '12:31 PM'
  },
  {
    id: 3,
    type: 'payment',
    content: 'You sent',
    sender: 'me',
    timestamp: '12:32 PM',
    paymentData: {
      type: 'send',
      amount: '0.0005',
      fiatAmount: '20.50',
      status: 'completed'
    }
  }
];

const MessageDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [showPayment, setShowPayment] = useState(false);
  const [message, setMessage] = useState("");

  const renderMessage = (msg: Message) => {
    if (msg.type === 'payment_request') {
      return (
        <div className="bg-zinc-900 rounded-xl p-4 max-w-[280px]">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-blue-500" />
            <span className="font-medium">Payment Request</span>
          </div>
          <div className="text-2xl font-bold mb-1">
            {msg.paymentData?.amount} BTC
          </div>
          <div className="text-sm text-zinc-400 mb-4">
            ≈ ${msg.paymentData?.fiatAmount}
          </div>
          <button className="w-full bg-blue-600 text-white rounded-lg py-2 px-4 font-medium hover:bg-blue-700 transition-colors">
            Pay Now
          </button>
        </div>
      );
    }

    if (msg.type === 'payment') {
      return (
        <div className="flex items-center gap-2">
          <span>{msg.content}</span>
          <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
            {msg.paymentData?.amount} BTC
          </span>
        </div>
      );
    }

    return msg.content;
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <div className="flex items-center p-4 border-b border-zinc-800">
        <button 
          onClick={() => navigate(-1)}
          className="mr-4"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <Avatar className="h-10 w-10 mr-3 bg-blue-600 flex items-center justify-center text-lg font-medium">
          <span>AS</span>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">Alice Smith</h2>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <p className="text-sm text-zinc-400">@alice</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.type === 'payment_request' ? '' :
                msg.sender === 'me' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-zinc-800 text-white'
              }`}
            >
              {renderMessage(msg)}
              <p className="text-xs text-zinc-300 mt-1">{msg.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center space-x-2">
          {!showPayment ? (
            <>
              <button 
                onClick={() => setShowPayment(true)}
                className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center"
              >
                <Zap className="h-5 w-5 text-white" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message"
                className="flex-1 bg-zinc-800 border-none rounded-full px-4 py-2 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Send className="h-5 w-5 text-white" />
              </button>
            </>
          ) : (
            <div className="flex-1 flex space-x-2">
              <button 
                onClick={() => navigate(`/send/${id}`)} 
                className="flex-1 bg-blue-600 text-white rounded-full py-2 px-4 font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" />
                <span>Send</span>
              </button>
              <button 
                onClick={() => navigate(`/request/${id}`)} 
                className="flex-1 bg-zinc-800 text-white rounded-full py-2 px-4 font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <QrCode className="h-5 w-5" />
                <span>Request</span>
              </button>
              <button 
                onClick={() => navigate(`/split/${id}`)} 
                className="flex-1 bg-zinc-800 text-white rounded-full py-2 px-4 font-medium hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <Split className="h-5 w-5" />
                <span>Split</span>
              </button>
              <button 
                onClick={() => setShowPayment(false)}
                className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default MessageDetail;
