import { motion } from "framer-motion";
import { Bitcoin, Shield, X, ChevronRight, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const walletTypes = [
  {
    id: 'bitcoin',
    title: 'Bitcoin',
    description: 'Simple and powerful Bitcoin wallet',
    setupTime: '2 min',
    icon: Bitcoin,
    features: ['Self-custody', 'Basic security', 'Easy to use']
  },
  {
    id: 'multisig',
    title: 'Multisig Vault',
    description: 'Best security for large amounts',
    setupTime: '5 min',
    icon: Shield,
    features: ['Multi-signature', 'Time-locks', 'Enhanced security']
  }
];

interface AddWalletViewProps {
  name: string;
  selectedType: 'bitcoin' | 'multisig' | null;
  showSeedModal: boolean;
  seedPhrase?: string[];
  seedConfirmed: boolean;
  onNameChange: (name: string) => void;
  onTypeSelect: (type: 'bitcoin' | 'multisig') => void;
  onClose: () => void;
  onSubmit: () => void;
  onImportWallet: () => void;
  onSeedModalClose: () => void;
  onSeedConfirm: () => void;
  onSeedConfirmChange: (confirmed: boolean) => void;
}

export function AddWalletView({
  name,
  selectedType,
  showSeedModal,
  seedPhrase = [],
  seedConfirmed,
  onNameChange,
  onTypeSelect,
  onClose,
  onSubmit,
  onImportWallet,
  onSeedModalClose,
  onSeedConfirm,
  onSeedConfirmChange
}: AddWalletViewProps) {
  // Validate if form is ready to submit
  const canSubmit = name.trim().length > 0 && selectedType !== null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1E1F20]">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-[#1E1F20] rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-normal">Add Wallet</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-xl text-zinc-400 font-normal">Name</label>
          <Input
            type="text"
            placeholder="My first wallet"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={cn(
              "bg-[#111112] border-none text-zinc-400 text-lg h-12 focus-visible:ring-0 focus-visible:ring-offset-0",
              name.trim().length > 0 && "text-white"
            )}
          />
        </div>

        {/* Type Selection */}
        <div className="space-y-2">
          <label className="text-xl text-zinc-400 font-normal">Type</label>
          <div className="space-y-3">
            {walletTypes.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <motion.button
                  key={type.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onTypeSelect(type.id as 'bitcoin' | 'multisig')}
                  className="w-full"
                >
                  <div className={cn(
                    "rounded-xl p-4 transition-all duration-200",
                    isSelected 
                      ? "bg-[#0A0B0D] shadow-[0_0_0_1px_#0052FF]" 
                      : "bg-[#111112]"
                  )}>
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        type.id === 'bitcoin' ? "bg-[#0052FF]" : "bg-orange-500"
                      )}>
                        <type.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h3 className={cn(
                            "text-xl font-normal",
                            isSelected ? "text-white" : "text-zinc-300"
                          )}>{type.title}</h3>
                          <div className="flex items-center gap-1 text-sm text-zinc-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{type.setupTime}</span>
                          </div>
                        </div>
                        <p className="text-base text-zinc-500 mb-2">{type.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {type.features.map((feature, index) => (
                            <span
                              key={index}
                              className={cn(
                                "px-3 py-1 rounded-full text-sm transition-colors",
                                isSelected 
                                  ? "text-[#0052FF]" 
                                  : "text-zinc-400 bg-[#0A0B0D]"
                              )}
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#0052FF] flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-[#1E1F20]">
        <div className="space-y-4">
          <button
            onClick={canSubmit ? onSubmit : undefined}
            disabled={!canSubmit}
            className={cn(
              "w-full h-12 text-lg font-normal rounded-xl transition-all duration-200",
              canSubmit 
                ? "bg-[#0052FF] hover:bg-[#0052FF]/90 text-white cursor-pointer" 
                : "bg-[#111112] text-zinc-600 cursor-not-allowed"
            )}
          >
            Create
          </button>
          <button 
            onClick={onImportWallet}
            className="w-full text-center text-[#0052FF] text-lg"
          >
            Import wallet
          </button>
        </div>
      </div>

      {/* Seed Display Modal */}
      <Dialog open={showSeedModal} onOpenChange={onSeedModalClose}>
        <DialogContent className="bg-[#111112] text-white border-[#1E1F20]">
          <DialogHeader>
            <DialogTitle>Backup Your Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <p className="text-center text-zinc-400">
              Your wallet was created. Take a moment to safely backup your mnemonic seed.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {seedPhrase.map((word, index) => (
                <div key={index} className="bg-[#0A0B0D] p-2 rounded">
                  <span className="text-zinc-400">{index + 1}.</span> {word}
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-backup"
                  checked={seedConfirmed}
                  onChange={(e) => onSeedConfirmChange(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                <label htmlFor="confirm-backup" className="text-sm text-zinc-400">
                  I have safely backed up my seed phrase
                </label>
              </div>
              <button
                onClick={seedConfirmed ? onSeedConfirm : undefined}
                disabled={!seedConfirmed}
                className={cn(
                  "w-full h-12 rounded-xl transition-all duration-200",
                  seedConfirmed
                    ? "bg-[#0052FF] hover:bg-[#0052FF]/90 text-white cursor-pointer"
                    : "bg-[#111112] text-zinc-600 cursor-not-allowed"
                )}
              >
                Continue
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 