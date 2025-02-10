import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, HelpCircle, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  generateWallet, 
  generateMultisigAddress, 
  WalletKeys, 
  MultisigConfig 
} from "@/lib/bitcoin";

interface VaultKey {
  id: number;
  keys?: WalletKeys;
  status: 'pending' | 'created' | 'imported';
}

interface VaultSettings {
  quorum: {
    required: number;
    total: number;
  };
  type: 'p2wsh' | 'p2sh-p2wsh' | 'p2sh';
}

export default function MultisigSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { name, accountId } = location.state || {};
  const { toast } = useToast();

  const [showInfo, setShowInfo] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [currentKey, setCurrentKey] = useState<VaultKey | null>(null);
  const [seedConfirmed, setSeedConfirmed] = useState(false);
  
  const [vaultKeys, setVaultKeys] = useState<VaultKey[]>([
    { id: 1, status: 'pending' },
    { id: 2, status: 'pending' },
    { id: 3, status: 'pending' }
  ]);

  const [settings, setSettings] = useState<VaultSettings>({
    quorum: { required: 2, total: 3 },
    type: 'p2wsh'
  });

  const createWallet = useMutation(api.wallets.createWallet);

  const handleCreateKey = async (keyId: number) => {
    try {
      // Generate a new key pair
      const newKeys = generateWallet('savings');
      
      const newKey: VaultKey = {
        id: keyId,
        keys: newKeys,
        status: 'created'
      };
      
      setCurrentKey(newKey);
      setShowSeedModal(true);

      console.log('🔑 Vault Key Generation:', {
        event: 'Vault Key Generated',
        keyId,
        address: newKeys.address,
        path: newKeys.path,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Key Generation Error:', {
        event: 'Key Generation Failed',
        keyId,
        error,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error creating key",
        description: "Failed to generate key pair. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleConfirmSeed = async () => {
    if (!currentKey?.keys) return;

    try {
      setVaultKeys(keys => 
        keys.map(key => 
          key.id === currentKey.id ? currentKey : key
        )
      );
      setShowSeedModal(false);
      setCurrentKey(null);
      setSeedConfirmed(false);

      // Check if all keys are created
      const updatedKeys = vaultKeys.map(key => 
        key.id === currentKey.id ? currentKey : key
      );

      if (updatedKeys.every(key => key.status === 'created')) {
        await handleCreateMultisigWallet(updatedKeys);
      }
      
    } catch (error) {
      console.error('❌ Key Confirmation Error:', {
        event: 'Key Confirmation Failed',
        keyId: currentKey.id,
        error,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error saving key",
        description: "Failed to save key. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateMultisigWallet = async (keys: VaultKey[]) => {
    if (!accountId || !name) return;

    try {
      // Create wallet in database with proper types
      const walletId = await createWallet({
        accountId,
        type: 'multisig',
        name,
        username: name.toLowerCase().replace(/\s+/g, '-'),
        multisigConfig: {
          requiredSignatures: settings.quorum.required,
          signers: keys.map(key => ({
            pubKey: key.keys!.keyPair.publicKey,
            weight: 1,
          })),
          scriptType: 'p2wsh',
        }
      });

      console.log('✅ Multisig Wallet Created:', {
        event: 'Multisig Wallet Created',
        walletId,
        requiredSignatures: settings.quorum.required,
        totalSigners: settings.quorum.total,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Multisig wallet created",
        description: "Your new vault is ready to use.",
      });

      navigate(-1);
      
    } catch (error) {
      console.error('❌ Multisig Creation Error:', {
        event: 'Multisig Creation Failed',
        error,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Error creating multisig wallet",
        description: "Failed to create vault. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-zinc-800 rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium">Create Vault</h1>
        <button className="p-2 hover:bg-zinc-800 rounded-full">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Initial Info Modal */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <div className="flex flex-col items-center text-center p-4 space-y-4">
            <div className="w-16 h-16 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center">
              {/* Add vault icon here */}
            </div>
            <DialogTitle className="text-xl font-medium">
              A Vault is a {settings.quorum.required}-of-{settings.quorum.total} multisig wallet
            </DialogTitle>
            <p className="text-zinc-400">
              It needs {settings.quorum.required} vault keys to spend and {settings.quorum.total - settings.quorum.required} backup key(s).
            </p>
            <Button
              onClick={() => {
                setShowInfo(false);
                setShowSettings(true);
              }}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              Let's start
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Vault Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 p-4">
            {/* Quorum Settings */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Quorum</label>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => setSettings(s => ({
                      ...s,
                      quorum: { ...s.quorum, required: Math.min(s.quorum.required + 1, s.quorum.total) }
                    }))}
                    className="p-2 hover:bg-zinc-800 rounded"
                  >▲</button>
                  <span className="text-2xl font-bold">{settings.quorum.required}</span>
                  <button 
                    onClick={() => setSettings(s => ({
                      ...s,
                      quorum: { ...s.quorum, required: Math.max(s.quorum.required - 1, 1) }
                    }))}
                    className="p-2 hover:bg-zinc-800 rounded"
                  >▼</button>
                </div>
                <span className="text-xl text-zinc-400">of</span>
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => setSettings(s => ({
                      ...s,
                      quorum: { ...s.quorum, total: Math.min(s.quorum.total + 1, 5) }
                    }))}
                    className="p-2 hover:bg-zinc-800 rounded"
                  >▲</button>
                  <span className="text-2xl font-bold">{settings.quorum.total}</span>
                  <button 
                    onClick={() => setSettings(s => ({
                      ...s,
                      quorum: { ...s.quorum, total: Math.max(s.quorum.total - 1, s.quorum.required) }
                    }))}
                    className="p-2 hover:bg-zinc-800 rounded"
                  >▼</button>
                </div>
              </div>
            </div>

            {/* Wallet Type Selection */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Script Type</label>
              <div className="space-y-2">
                {[
                  { id: 'p2wsh' as const, label: 'Native SegWit (P2WSH)' },
                  { id: 'p2sh-p2wsh' as const, label: 'Wrapped SegWit (P2SH-P2WSH)' },
                  { id: 'p2sh' as const, label: 'Legacy (P2SH)' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSettings(s => ({ ...s, type: type.id }))}
                    className={`w-full p-3 rounded flex items-center justify-between ${
                      settings.type === type.id
                        ? 'bg-blue-500 bg-opacity-20 border border-blue-500'
                        : 'bg-zinc-800'
                    }`}
                  >
                    <span>{type.label}</span>
                    {settings.type === type.id && (
                      <Check className="w-5 h-5 text-blue-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setShowSettings(false)}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seed Display Modal */}
      <Dialog open={showSeedModal} onOpenChange={setShowSeedModal}>
        <DialogContent className="bg-zinc-900 text-white border-zinc-800">
          <DialogHeader>
            <DialogTitle>Vault Key {currentKey?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 p-4">
            <p className="text-center text-zinc-400">
              Your Vault key was created. Take a moment to safely backup your mnemonic seed.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {currentKey?.keys?.mnemonic.split(' ').map((word, index) => (
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

      {/* Main Content - Key Creation */}
      <div className="p-4">
        <div className="space-y-6">
          {vaultKeys.map((key, index) => (
            <div key={key.id} className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                key.status === 'created' 
                  ? 'bg-green-500' 
                  : 'bg-zinc-800'
              }`}>
                {key.status === 'created' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  key.id
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">Vault Key {key.id}</h3>
                {key.status === 'created' && key.keys && (
                  <p className="text-sm text-zinc-400">
                    {key.keys.address.slice(0, 8)}...{key.keys.address.slice(-8)}
                  </p>
                )}
              </div>
              {key.status === 'pending' && (
                <div className="space-x-2">
                  <Button
                    onClick={() => handleCreateKey(key.id)}
                    className="bg-zinc-800 hover:bg-zinc-700"
                  >
                    Create New
                  </Button>
                  <Button
                    variant="outline"
                    className="border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  >
                    Import
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-zinc-800">
        <Button
          disabled={!vaultKeys.every(key => key.status === 'created')}
          onClick={() => handleCreateMultisigWallet(vaultKeys)}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
        >
          Create Vault
        </Button>
      </div>
    </div>
  );
} 