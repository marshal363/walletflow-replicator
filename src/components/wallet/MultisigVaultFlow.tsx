import React, { useState } from 'react';
import { ChevronLeft, HelpCircle, Check } from 'lucide-react';
import { 
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from 'framer-motion';

interface MultisigVaultFlowProps {
  onBack: () => void;
  onComplete: (vaultKeys: string[]) => void;
  walletName: string;
}

type Step = 'intro' | 'quorum' | 'keys' | 'complete';
type WalletType = 'best-practice' | 'best-compatibility' | 'legacy';

export default function MultisigVaultFlow({
  onBack,
  onComplete,
  walletName,
}: MultisigVaultFlowProps) {
  const [step, setStep] = useState<Step>('intro');
  const [quorum, setQuorum] = useState({ required: 2, total: 3 });
  const [walletType, setWalletType] = useState<WalletType>('best-practice');
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [vaultKeys, setVaultKeys] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [seeds] = useState<string[][]>([
    ['silk', 'uncover', 'text', 'grant', 'farm', 'pave', 'cool', 'capable', 'increase', 'slide', 'shrimp', 'glove'],
    ['inner', 'panic', 'person', 'client', 'drink', 'young', 'profit', 'cream', 'truck', 'crater', 'okay', 'saddle'],
    ['hammer', 'advance', 'slab', 'top', 'gather', 'another', 'black', 'mango', 'sport', 'skirt', 'skull', 'income']
  ]);

  React.useEffect(() => {
    setStep('intro');
    setIsTransitioning(false);
  }, []);

  const handleBack = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (step === 'intro') {
      await new Promise(resolve => setTimeout(resolve, 150));
      onBack();
    } else if (step === 'complete') {
      if (currentKeyIndex > 0) {
        setCurrentKeyIndex(currentKeyIndex - 1);
      } else {
        setStep('keys');
      }
    } else if (step === 'keys') {
      if (currentKeyIndex > 0) {
        setCurrentKeyIndex(currentKeyIndex - 1);
        setVaultKeys(prev => prev.slice(0, -1));
      } else {
        setStep('quorum');
      }
    } else {
      setStep('intro');
    }

    setIsTransitioning(false);
  };

  const handleNext = async () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    if (step === 'intro') {
      setStep('quorum');
    } else if (step === 'quorum') {
      setStep('keys');
      setCurrentKeyIndex(0);
      setVaultKeys([]);
    } else if (step === 'keys') {
      setVaultKeys(prev => [...prev, seeds[currentKeyIndex].join(' ')]);
      setStep('complete');
    } else if (step === 'complete') {
      if (currentKeyIndex < quorum.total - 1) {
        setCurrentKeyIndex(prev => prev + 1);
        setStep('keys');
      } else {
        await new Promise(resolve => setTimeout(resolve, 150));
        onComplete(vaultKeys);
      }
    }

    setIsTransitioning(false);
  };

  const handleImport = () => {
    // Handle import functionality
    console.log('Import functionality to be implemented');
  };

  const renderStepIndicator = () => {
    const totalSteps = quorum.total + 2; // intro + quorum + keys
    const currentStep = step === 'intro' ? 1 : step === 'quorum' ? 2 : currentKeyIndex + 3;

    return (
      <div className="flex items-center justify-center gap-1 mt-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-full transition-all",
              i < currentStep ? "w-4 bg-blue-500" : "w-1.5 bg-zinc-600"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button 
          onClick={handleBack}
          disabled={isTransitioning}
          className="p-2 hover:bg-zinc-800 rounded-full disabled:opacity-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center font-medium">
          {step === 'intro' ? 'Create Vault' : 
           step === 'quorum' ? 'Vault Settings' :
           step === 'keys' ? `Vault Key ${currentKeyIndex + 1}` :
           'Key Created'}
        </div>
      </div>

      {renderStepIndicator()}

      <AnimatePresence mode="wait" initial={false}>
        <div className="mt-6">
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-blue-400 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">A Vault is a 2-of-3 multisig wallet.</h2>
                <p className="text-zinc-400">
                  It needs 2 vault keys to spend and a third one you can use as backup.
                </p>
              </div>
              <Button 
                onClick={handleNext}
                disabled={isTransitioning}
                className="w-full"
              >
                Let's start
              </Button>
            </motion.div>
          )}

          {step === 'quorum' && (
            <motion.div
              key="quorum"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <DialogHeader>
                <DialogTitle>Quorum</DialogTitle>
                <DialogDescription>
                  Required keys out of the total
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center items-center gap-4">
                <div className="space-y-2">
                  <button 
                    onClick={() => setQuorum(q => ({ ...q, required: Math.min(q.required + 1, q.total) }))}
                    className="w-8 h-8 flex items-center justify-center text-blue-500"
                  >
                    ▲
                  </button>
                  <div className="text-4xl font-bold text-center">{quorum.required}</div>
                  <button 
                    onClick={() => setQuorum(q => ({ ...q, required: Math.max(q.required - 1, 1) }))}
                    className="w-8 h-8 flex items-center justify-center text-blue-500"
                  >
                    ▼
                  </button>
                </div>
                <div className="text-2xl text-zinc-500">of</div>
                <div className="space-y-2">
                  <button 
                    onClick={() => setQuorum(q => ({ ...q, total: Math.min(q.total + 1, 5) }))}
                    className="w-8 h-8 flex items-center justify-center text-blue-500"
                  >
                    ▲
                  </button>
                  <div className="text-4xl font-bold text-center">{quorum.total}</div>
                  <button 
                    onClick={() => setQuorum(q => ({ ...q, total: Math.max(q.total - 1, q.required) }))}
                    className="w-8 h-8 flex items-center justify-center text-blue-500"
                  >
                    ▼
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    walletType === 'best-practice' 
                      ? "border-blue-500 bg-blue-500/10" 
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                  onClick={() => setWalletType('best-practice')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Best practice (p2wsh)</p>
                    </div>
                    {walletType === 'best-practice' && <Check className="h-5 w-5 text-blue-500" />}
                  </div>
                </div>
                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    walletType === 'best-compatibility' 
                      ? "border-blue-500 bg-blue-500/10" 
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                  onClick={() => setWalletType('best-compatibility')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Best compatibility (p2sh-p2wsh)</p>
                    </div>
                    {walletType === 'best-compatibility' && <Check className="h-5 w-5 text-blue-500" />}
                  </div>
                </div>
                <div 
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-colors",
                    walletType === 'legacy' 
                      ? "border-blue-500 bg-blue-500/10" 
                      : "border-zinc-800 hover:border-zinc-700"
                  )}
                  onClick={() => setWalletType('legacy')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Legacy (p2sh)</p>
                    </div>
                    {walletType === 'legacy' && <Check className="h-5 w-5 text-blue-500" />}
                  </div>
                </div>
              </div>
              <Button onClick={handleNext} className="w-full">
                Create
              </Button>
            </motion.div>
          )}

          {step === 'keys' && (
            <motion.div
              key="keys"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Vault Key {currentKeyIndex + 1}</h2>
                <button className="p-2 hover:bg-zinc-800 rounded-full">
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  {Array.from({ length: quorum.total }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center border-2",
                        i === currentKeyIndex
                          ? "border-blue-500 text-blue-500"
                          : i < currentKeyIndex
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-zinc-700"
                      )}
                    >
                      {i < currentKeyIndex ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={handleNext}
                  >
                    Create New
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleImport}
                  >
                    Import
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Vault Key {currentKeyIndex + 1} Created</h2>
                <p className="text-zinc-400">
                  Take a moment to safely backup your mnemonic seed.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {seeds[currentKeyIndex].map((word, i) => (
                  <div 
                    key={i}
                    className="p-2 bg-zinc-900 rounded text-sm text-center"
                  >
                    {i + 1}. {word}
                  </div>
                ))}
              </div>
              <Button onClick={handleNext} className="w-full">
                {currentKeyIndex < quorum.total - 1 ? 'Next Key' : 'Done'}
              </Button>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
} 