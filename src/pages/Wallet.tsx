import React, { useState } from "react";
import { 
  Wallet as WalletIcon, 
  Home, 
  Bell, 
  Navigation as NavigationIcon, 
  Zap,
  ChevronRight,
  Info,
  CreditCard,
  MoreVertical,
  ArrowLeft,
  MessageCircle,
  MessageCircleCodeIcon,
  MessageCircleHeart,
  Text,
  Inbox,
  InboxIcon,
  LucideInbox,
  MessageSquare,
  MessageSquareText,
  MessageCircleX,
  MessageSquareIcon,
  Mail
} from "lucide-react";
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";

const Wallet = () => {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCardActions, setShowCardActions] = useState(false);

  const cards = [
    {
      id: 1,
      type: 'VIRTUAL',
      lastFour: '0077',
      style: 'bg-purple-900',
      brand: 'mastercard',
      transactions: [
        { 
          id: 1, 
          merchant: "McDonald's", 
          amount: 10.19, 
          type: 'Apple Pay', 
          date: 'Thursday',
          icon: '🍔'
        },
        { 
          id: 2, 
          merchant: 'MAXI', 
          amount: 16.00, 
          location: 'Montréal, QC', 
          date: 'Thursday',
          icon: '🎯'
        },
        { 
          id: 3, 
          merchant: "McDonald's", 
          amount: 3.84, 
          type: 'Apple Pay', 
          date: 'Wednesday',
          icon: '🍔'
        },
        { 
          id: 4, 
          merchant: "McDonald's", 
          amount: 10.19, 
          type: 'Apple Pay', 
          date: 'Wednesday',
          icon: '🍔'
        },
        { 
          id: 5, 
          merchant: "Couche-Tard #1190", 
          amount: 14.94, 
          location: 'Montréal, QC', 
          date: 'Wednesday',
          icon: '🍴'
        },
        { 
          id: 6, 
          merchant: "Esso Couche-Tard 1190", 
          amount: 51.00, 
          location: 'Montréal, QC', 
          date: 'Wednesday',
          icon: '🏢'
        }
      ]
    }
  ];

  const CardView = ({ card }) => (
    <div 
      className={`${card.style} rounded-xl p-6 w-full relative mb-4`}
      onClick={() => setSelectedCard(card)}
    >
      <div className="flex flex-col h-48">
        <div className="flex justify-between items-start">
          <span className="text-sm font-medium text-yellow-400">{card.type}</span>
          {card.brand === 'mastercard' && (
            <div className="flex">
              <div className="w-8 h-8 bg-red-500 rounded-full opacity-80" />
              <div className="w-8 h-8 bg-orange-500 rounded-full -ml-4 opacity-80" />
            </div>
          )}
        </div>
        <div className="mt-auto">
          <span className="text-xl font-light">•••• {card.lastFour}</span>
        </div>
      </div>
    </div>
  );

  const CardActions = () => (
    <div className="fixed inset-0 z-50" onClick={() => setShowCardActions(false)}>
      <div className="absolute right-4 top-16 w-64 bg-zinc-900 rounded-xl overflow-hidden shadow-lg">
        <button className="flex items-center justify-between w-full p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5" />
            <span>Card Number</span>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </button>
        <button className="flex items-center justify-between w-full p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5" />
            <span>Card Details</span>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </button>
        <button className="flex items-center justify-between w-full p-4">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-600" />
        </button>
      </div>
    </div>
  );

  const CardDetails = ({ card }) => (
    <div className="fixed inset-0 bg-black z-40">
      <header className="flex items-center justify-between p-4">
        <button onClick={() => setSelectedCard(null)} className="text-white">
          Done
        </button>
        <button onClick={() => setShowCardActions(!showCardActions)}>
          <MoreVertical className="h-6 w-6" />
        </button>
      </header>

      <div className="p-4">
        <CardView card={card} />
        
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Latest Transactions</h2>
          <div className="divide-y divide-zinc-800">
            {card.transactions?.map(tx => (
              <div 
                key={tx.id}
                className="flex items-center justify-between py-4 cursor-pointer"
                onClick={() => setShowDetails(tx)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-900 rounded-lg flex items-center justify-center text-xl">
                    {tx.icon}
                  </div>
                  <div>
                    <p className="font-medium">{tx.merchant}</p>
                    <p className="text-sm text-zinc-400">{tx.type || tx.location}</p>
                    <p className="text-sm text-zinc-500">{tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">${tx.amount.toFixed(2)}</span>
                  <ChevronRight className="h-5 w-5 text-zinc-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showCardActions && <CardActions />}
    </div>
  );

  const TransactionDetails = ({ transaction }) => (
    <div className="fixed inset-0 bg-black z-50">
      <header className="flex items-center justify-between p-4">
        <button onClick={() => setShowDetails(false)}>
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-lg font-bold">Transaction Details</h1>
        <div className="w-6" />
      </header>

      <div className="p-4 space-y-6">
        <div className="flex items-center justify-center flex-col">
          <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 text-3xl">
            {transaction.icon}
          </div>
          <h2 className="text-2xl font-bold">{transaction.merchant}</h2>
          <p className="text-zinc-400">{transaction.date}</p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-4 space-y-4">
          <div className="flex justify-between">
            <span className="text-zinc-400">Amount</span>
            <span className="font-bold">${transaction.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">Type</span>
            <span>{transaction.type || 'Purchase'}</span>
          </div>
          {transaction.location && (
            <div className="flex justify-between">
              <span className="text-zinc-400">Location</span>
              <span>{transaction.location}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <Header title="Wallet" showBack={false} />
      
      <div className="flex-1 px-4 py-2 pb-24">
        {selectedCard ? (
          <CardDetails card={selectedCard} />
        ) : (
          <>
            {cards.map(card => (
              <CardView key={card.id} card={card} />
            ))}
          </>
        )}
        {showDetails && <TransactionDetails transaction={showDetails} />}
      </div>

      <Navigation />
    </div>
  );
};

export default Wallet; 