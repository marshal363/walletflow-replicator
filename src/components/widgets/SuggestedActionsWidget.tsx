import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Wallet, ArrowUpCircle, LockKeyhole, Rocket, X } from 'lucide-react';

interface Action {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'required' | 'recommended';
  gradient: string;
  action: () => void;
}

interface SuggestedActionsWidgetProps {
  onActionClick: (actionId: string) => void;
}

const SuggestedActionsWidget: React.FC<SuggestedActionsWidgetProps> = ({
  onActionClick
}) => {
  const [dismissedActions, setDismissedActions] = useState<string[]>([]);
  
  const actions: Action[] = [
    {
      id: 'deposit',
      title: 'Deposit funds now',
      description: 'and start your Starknet journey',
      icon: <Rocket className="h-5 w-5 text-white" />,
      type: 'recommended',
      gradient: 'from-blue-500 via-purple-500 to-purple-600',
      action: () => onActionClick('deposit')
    },
    {
      id: 'backup',
      title: 'Backup your wallet',
      description: 'Secure your funds with a backup',
      icon: <Shield className="h-5 w-5 text-white" />,
      type: 'required',
      gradient: 'from-red-500 to-red-600',
      action: () => onActionClick('backup')
    },
    {
      id: 'multisig',
      title: 'Setup Savings Multisig',
      description: 'Secure long-term storage',
      icon: <LockKeyhole className="h-5 w-5 text-white" />,
      type: 'required',
      gradient: 'from-orange-500 to-orange-600',
      action: () => onActionClick('multisig')
    }
  ];

  const visibleActions = actions.filter(action => !dismissedActions.includes(action.id));

  const handleDismiss = (actionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedActions(prev => [...prev, actionId]);
  };

  if (visibleActions.length === 0) return null;

  return (
    <div className="space-y-2 px-4">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-lg text-zinc-400">Suggested Actions</h2>
      </div>
      <div className="relative overflow-hidden">
        <div className="flex snap-x snap-mandatory overflow-x-auto hide-scrollbar gap-3">
          {visibleActions.map((action, index) => (
            <div
              key={action.id}
              onClick={action.action}
              className={`relative flex-none snap-center w-[calc(100vw-64px)] max-w-[400px] h-[72px] overflow-hidden rounded-xl bg-gradient-to-r ${action.gradient} cursor-pointer`}
            >
              <div className="absolute inset-0 bg-black/10" />
              <div
                onClick={(e) => handleDismiss(action.id, e)}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/20 hover:bg-black/30 transition-colors z-10 cursor-pointer"
              >
                <X className="h-4 w-4 text-white/80" />
              </div>
              <div className="relative h-full p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-black/20">
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-white text-base">{action.title}</h4>
                  <p className="text-sm text-white/80">{action.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center gap-1.5 mt-1">
        {visibleActions.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              index === 0 ? 'bg-blue-500 w-3' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default SuggestedActionsWidget; 