import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ChevronRight } from "lucide-react";
import { Bitcoin, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateMnemonic } from "bip39";
import { motion } from "framer-motion";

interface WalletType {
  id: 'bitcoin' | 'multisig';
  title: string;
  description: string;
  icon: typeof Bitcoin | typeof Shield;
}

const walletTypes: WalletType[] = [
  {
    id: 'bitcoin',
    title: 'Bitcoin',
    description: 'Simple and powerful Bitcoin wallet',
    icon: Bitcoin
  },
  {
    id: 'multisig',
    title: 'Multisig Vault',
    description: 'Best security for large amounts',
    icon: Shield
  }
];

export default function AddWallet() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<'bitcoin' | 'multisig' | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string>('');

  const handleCreateBitcoinWallet = () => {
    const mnemonic = generateMnemonic();
    setSeedPhrase(mnemonic);
    setShowSeedModal(true);
  };

  const handleSubmit = () => {
    if (!name || !selectedType) return;
    
    if (selectedType === 'multisig') {
      navigate('/add-wallet/multisig-setup', { state: { name } });
    } else {
      handleCreateBitcoinWallet();
    }
  };

  const handleConfirmSeed = () => {
    // Here we would save the wallet data
    console.log('Creating Bitcoin wallet:', {
      name,
      type: 'bitcoin',
      mnemonic: seedPhrase
    });
    
    // Navigate back to wallet list
    navigate(-1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="min-h-screen bg-black text-white"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-zinc-800 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium">Add Wallet</h1>
        <div className="w-10" /> {/* Spacer for alignment */}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Name Input */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Name</label>
          <Input
            type="text"
            placeholder="My first wallet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-zinc-900 border-zinc-800 text-white"
          />
        </div>

        {/* Type Selection */}
        <div className="space-y-2">
          <label className="text-sm text-zinc-400">Type</label>
          <div className="space-y-3">
            {walletTypes.map((type) => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedType(type.id)}
                className={`w-full p-4 rounded-xl flex items-center justify-between ${
                  selectedType === type.id
                    ? 'bg-blue-500 bg-opacity-20 border border-blue-500'
                    : 'bg-zinc-900 border border-zinc-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center">
                    <type.icon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">{type.title}</h3>
                    <p className="text-sm text-zinc-400">{type.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-400" />
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-zinc-800">
        <div className="space-y-4">
          <Button
            onClick={handleSubmit}
            disabled={!name || !selectedType}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          >
            Create
          </Button>
          <button className="w-full text-center text-blue-500">
            Import wallet
          </button>
        </div>
      </div>

      {/* Seed Display Modal */}
      <Dialog open={showSeedModal} onOpenChange={setShowSeedModal}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Backup Your Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <p className="text-center text-zinc-400">
              Your wallet was created. Take a moment to safely backup your mnemonic seed.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {seedPhrase.split(' ').map((word, index) => (
                <div key={index} className="bg-zinc-800 p-2 rounded">
                  <span className="text-zinc-400">{index + 1}.</span> {word}
                </div>
              ))}
            </div>
            <Button
              onClick={handleConfirmSeed}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              I've Backed Up My Seed
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
} 