import * as bitcoin from 'bitcoinjs-lib';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';
import { Buffer } from 'buffer';
import hash from 'hash.js';

// Ensure Buffer is available globally
if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

// Initialize libraries with secp256k1
const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

// Configure bitcoinjs-lib for browser environment
bitcoin.initEccLib(ecc);

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface WalletKeys {
  mnemonic: string;
  keyPair: KeyPair;
  path: string;
  address: string;
}

export interface MultisigConfig {
  requiredSignatures: number;
  signers: Array<{
    pubKey: string;
    weight: number;
  }>;
  scriptType: 'p2sh' | 'p2wsh' | 'p2tr';
}

export const NETWORKS = {
  bitcoin: bitcoin.networks.bitcoin,
  testnet: bitcoin.networks.testnet,
  regtest: bitcoin.networks.regtest,
} as const;

export type Network = keyof typeof NETWORKS;

/**
 * Generate a new mnemonic phrase
 */
export function generateNewMnemonic(): string {
  return generateMnemonic(256); // 24 words for maximum security
}

/**
 * Validate a mnemonic phrase
 */
export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic);
}

/**
 * Generate key pair from mnemonic
 */
export function generateKeyPairFromMnemonic(
  mnemonic: string,
  path: string = "m/84'/0'/0'/0/0",
  network: bitcoin.Network = NETWORKS.bitcoin
): KeyPair {
  try {
    console.log('🔄 Generating key pair from mnemonic:', {
      event: 'Key Pair Generation Start',
      path,
      timestamp: new Date().toISOString()
    });

    const seed = mnemonicToSeedSync(mnemonic);
    console.log('✅ Seed generated from mnemonic');

    const root = bip32.fromSeed(seed, network);
    console.log('✅ Root key derived');

    const child = root.derivePath(path);
    console.log('✅ Child key derived at path:', path);

    return {
      publicKey: child.publicKey.toString('hex'),
      privateKey: child.privateKey!.toString('hex'),
    };
  } catch (error) {
    console.error('❌ Key Pair Generation Error:', {
      event: 'Key Pair Generation Failed',
      error,
      path,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Generate a single-sig wallet
 */
export function generateWallet(
  type: 'spending' | 'savings',
  network: bitcoin.Network = NETWORKS.bitcoin
): WalletKeys {
  try {
    console.log('🔄 Generating wallet:', {
      event: 'Generate Wallet Start',
      type,
      network: network.bech32,
      timestamp: new Date().toISOString()
    });

    const mnemonic = generateNewMnemonic();
    console.log('✅ Mnemonic generated');

    const path = type === 'spending' 
      ? "m/84'/0'/0'/0/0"  // BIP84 for native segwit
      : "m/86'/0'/0'/0/0"; // BIP86 for taproot
    
    console.log('🔄 Using derivation path:', path);

    const keyPair = generateKeyPairFromMnemonic(mnemonic, path, network);
    console.log('✅ Key pair generated');

    const { address } = generateAddress(keyPair.publicKey, type, network);
    console.log('✅ Address generated:', {
      type,
      addressPrefix: address.substring(0, 4),
      timestamp: new Date().toISOString()
    });

    return {
      mnemonic,
      keyPair,
      path,
      address,
    };
  } catch (error) {
    console.error('❌ Wallet Generation Error:', {
      event: 'Generate Wallet Failed',
      error,
      type,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Generate address from public key
 */
export function generateAddress(
  publicKey: string,
  type: 'spending' | 'savings' | 'multisig',
  network: bitcoin.Network = NETWORKS.bitcoin,
  multisigConfig?: MultisigConfig
): { address: string; redeemScript?: Buffer } {
  const pubkeyBuffer = Buffer.from(publicKey, 'hex');

  if (type === 'multisig' && multisigConfig) {
    return generateMultisigAddress(multisigConfig, network);
  }

  // For single-sig wallets
  const payment = type === 'spending'
    ? bitcoin.payments.p2wpkh({ pubkey: pubkeyBuffer, network }) // Native SegWit
    : bitcoin.payments.p2tr({ internalPubkey: pubkeyBuffer.slice(1), network }); // Taproot

  return {
    address: payment.address!,
    redeemScript: payment.output,
  };
}

/**
 * Generate multisig address
 */
export function generateMultisigAddress(
  config: MultisigConfig,
  network: bitcoin.Network = NETWORKS.bitcoin
): { address: string; redeemScript: Buffer } {
  const pubkeys = config.signers.map(signer => 
    Buffer.from(signer.pubKey, 'hex')
  );

  let payment;
  switch (config.scriptType) {
    case 'p2sh':
      payment = bitcoin.payments.p2sh({
        redeem: bitcoin.payments.p2ms({
          m: config.requiredSignatures,
          pubkeys,
          network,
        }),
        network,
      });
      break;
    
    case 'p2wsh':
      payment = bitcoin.payments.p2wsh({
        redeem: bitcoin.payments.p2ms({
          m: config.requiredSignatures,
          pubkeys,
          network,
        }),
        network,
      });
      break;
    
    case 'p2tr':
      // For P2TR multisig, we'd typically use MuSig2 or tapscript
      // This is a simplified version
      payment = bitcoin.payments.p2tr({
        internalPubkey: pubkeys[0].slice(1),
        network,
      });
      break;
  }

  if (!payment.address || !payment.output) {
    throw new Error('Failed to generate multisig address');
  }

  return {
    address: payment.address,
    redeemScript: payment.output,
  };
}

/**
 * Verify a signature
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  const messageHash = Buffer.from(
    hash.sha256().update(message).digest('hex'),
    'hex'
  );
  const pubkeyBuffer = Buffer.from(publicKey, 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');

  return ECPair.fromPublicKey(pubkeyBuffer).verify(messageHash, signatureBuffer);
}

/**
 * Sign a message
 */
export function signMessage(
  message: string,
  privateKey: string
): string {
  const messageHash = Buffer.from(
    hash.sha256().update(message).digest('hex'),
    'hex'
  );
  const keyPair = ECPair.fromPrivateKey(Buffer.from(privateKey, 'hex'));
  return keyPair.sign(messageHash).toString('hex');
} 