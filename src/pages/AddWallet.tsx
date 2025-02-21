import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAccountStore } from "@/hooks/useUserAccountsAndWallets";
import { generateWallet, WalletKeys } from "@/lib/bitcoin";
import { AddWalletView } from "@/components/wallet/AddWalletView";

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
    <AddWalletView
      name={name}
      selectedType={selectedType}
      showSeedModal={showSeedModal}
      seedPhrase={walletKeys?.mnemonic.split(' ')}
      seedConfirmed={seedConfirmed}
      onNameChange={setName}
      onTypeSelect={setSelectedType}
      onClose={() => navigate(-1)}
      onSubmit={handleSubmit}
      onImportWallet={() => console.log('Import wallet')}
      onSeedModalClose={() => setShowSeedModal(false)}
      onSeedConfirm={handleConfirmSeed}
      onSeedConfirmChange={setSeedConfirmed}
    />
  );
} 