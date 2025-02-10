import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, ChevronRight } from "lucide-react";
import { Bitcoin, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { generateWallet, isValidMnemonic, WalletKeys, NETWORKS } from "@/lib/bitcoin";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAccountStore } from "@/hooks/useUserAccountsAndWallets";

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
  const { toast } = useToast();
  const { currentAccountId } = useAccountStore();
  
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<'bitcoin' | 'multisig' | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [walletKeys, setWalletKeys] = useState<WalletKeys | null>(null);
  const [seedConfirmed, setSeedConfirmed] = useState(false);

  const createWallet = useMutation(api.wallets.createWallet);

  const handleCreateBitcoinWallet = async () => {
    try {
      console.log('🔄 Starting wallet generation:', {
        event: 'Wallet Generation Start',
        type: selectedType,
        timestamp: new Date().toISOString()
      });

      // Generate wallet based on type (spending for bitcoin, savings for taproot)
      const walletType = selectedType === 'bitcoin' ? 'spending' : 'savings';
      
      console.log('🔄 Generating wallet with type:', {
        event: 'Wallet Type Selected',
        walletType,
        timestamp: new Date().toISOString()
      });

      // Ensure all required libraries are loaded
      if (!generateWallet) {
        throw new Error('Bitcoin utilities not properly initialized');
      }

      const newWallet = generateWallet(walletType);
      
      if (!newWallet || !newWallet.keyPair || !newWallet.mnemonic) {
        throw new Error('Failed to generate wallet keys');
      }

      console.log('✅ Wallet generated successfully:', {
        event: 'Wallet Keys Generated',
        type: walletType,
        address: newWallet.address,
        path: newWallet.path,
        hasPublicKey: !!newWallet.keyPair.publicKey,
        hasPrivateKey: !!newWallet.keyPair.privateKey,
        hasWIF: !!newWallet.keyPair.wif,
        timestamp: new Date().toISOString()
      });
      
      setWalletKeys(newWallet);
      setShowSeedModal(true);
      
    } catch (error) {
      console.error('❌ Wallet Generation Error:', {
        event: 'Wallet Generation Failed',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        type: selectedType,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error creating wallet",
        description: error instanceof Error 
          ? `Failed to generate wallet: ${error.message}`
          : "Failed to generate wallet keys. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!name || !selectedType || !currentAccountId) return;
    
    try {
      console.log('🔄 Starting wallet creation:', {
        event: 'Wallet Creation Start',
        type: selectedType,
        name,
        accountId: currentAccountId,
        timestamp: new Date().toISOString()
      });

      if (selectedType === 'multisig') {
        navigate('/add-wallet/multisig-setup', { 
          state: { 
            name,
            accountId: currentAccountId 
          } 
        });
        return;
      }

      await handleCreateBitcoinWallet();
      
    } catch (error) {
      console.error('❌ Wallet Creation Error:', {
        event: 'Wallet Creation Failed',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        type: selectedType,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error creating wallet",
        description: error instanceof Error 
          ? `Something went wrong: ${error.message}`
          : "Something went wrong. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmSeed = async () => {
    if (!walletKeys || !currentAccountId) return;

    try {
      const username = name.toLowerCase().replace(/\s+/g, '-');
      
      // Create wallet in database
      const walletId = await createWallet({
        accountId: currentAccountId,
        type: selectedType === 'bitcoin' ? 'spending' : 'savings',
        name,
        username,
      });

      console.log('✅ Wallet Created:', {
        event: 'Wallet Created in DB',
        walletId: walletId,
        type: selectedType,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Wallet created successfully",
        description: "Your new wallet is ready to use.",
      });

      // Navigate back to wallet list
      navigate(-1);
      
    } catch (error) {
      console.error('❌ Database Error:', {
        event: 'Wallet DB Creation Failed',
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error saving wallet",
        description: error instanceof Error 
          ? `Failed to save wallet: ${error.message}`
          : "Failed to save wallet. Please try again.",
        variant: "destructive"
      });
    }
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
            disabled={!name || !selectedType || !currentAccountId}
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
              {walletKeys?.mnemonic.split(' ').map((word, index) => (
                <div key={index} className="bg-zinc-800 p-2 rounded">
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
                  onChange={(e) => setSeedConfirmed(e.target.checked)}
                  className="rounded border-zinc-600"
                />
                <label htmlFor="confirm-backup" className="text-sm text-zinc-400">
                  I have safely backed up my seed phrase
                </label>
              </div>
              <Button
                onClick={handleConfirmSeed}
                disabled={!seedConfirmed}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
              >
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
} 