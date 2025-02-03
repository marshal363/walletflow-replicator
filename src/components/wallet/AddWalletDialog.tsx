import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import MultisigVaultFlow from './MultisigVaultFlow';

interface AddWalletDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (walletType: 'Lightning' | 'Multisig', name: string, vaultKeys?: string[]) => void;
}

type Step = 'initial' | 'multisig-setup';

export default function AddWalletDialog({
  isOpen,
  onClose,
  onComplete,
}: AddWalletDialogProps) {
  // Form state
  const [walletName, setWalletName] = useState('');
  const [selectedWalletType, setSelectedWalletType] = useState<'bitcoin' | 'multisig' | null>(null);
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<Step>('initial');

  // Reset all state when dialog closes
  const handleClose = () => {
    onClose();
    // Reset after animation completes
    setTimeout(() => {
      setCurrentStep('initial');
      setWalletName('');
      setSelectedWalletType(null);
    }, 150);
  };

  // Handle wallet creation
  const handleCreateWallet = () => {
    if (!selectedWalletType || !walletName) return;

    if (selectedWalletType === 'multisig') {
      setCurrentStep('multisig-setup');
    } else {
      onComplete('Lightning', walletName);
      handleClose();
    }
  };

  // Handle multisig completion
  const handleMultisigComplete = (vaultKeys: string[]) => {
    onComplete('Multisig', walletName, vaultKeys);
    handleClose();
  };

  // Handle back navigation from multisig flow
  const handleBack = () => {
    setCurrentStep('initial');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        {currentStep === 'initial' ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-zinc-800 rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <DialogTitle>Add Wallet</DialogTitle>
            </div>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Input
                  id="name"
                  placeholder="Wallet name"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    selectedWalletType === 'bitcoin' 
                      ? "border-blue-500 bg-blue-500/10" 
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                  onClick={() => setSelectedWalletType('bitcoin')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                      ₿
                    </div>
                    <div>
                      <p className="font-medium">Bitcoin</p>
                      <p className="text-sm text-zinc-500">Simple and powerful Bitcoin wallet</p>
                    </div>
                  </div>
                </div>

                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    selectedWalletType === 'multisig' 
                      ? "border-purple-500 bg-purple-500/10" 
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                  onClick={() => setSelectedWalletType('multisig')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      🔒
                    </div>
                    <div>
                      <p className="font-medium">Multisig Vault</p>
                      <p className="text-sm text-zinc-500">Best security for large amounts</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleCreateWallet}
                  disabled={!walletName || !selectedWalletType}
                  className="w-full"
                >
                  Create
                </Button>
                <Button 
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => console.log('Import wallet')}
                >
                  Import wallet
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <MultisigVaultFlow
            onBack={handleBack}
            onComplete={handleMultisigComplete}
            walletName={walletName}
          />
        )}
      </DialogContent>
    </Dialog>
  );
} 