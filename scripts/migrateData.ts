import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import fs from 'fs/promises';
import path from 'path';

// Initialize Convex client
const client = new ConvexHttpClient(process.env.CONVEX_URL!);

interface User {
  clerkId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  profileImageUrl?: string;
  createdAt: string;
  lastSignInAt?: string;
  updatedAt: string;
  preferences: {
    defaultCurrency: string;
    notifications: boolean;
    twoFactorEnabled: boolean;
    theme: "light" | "dark" | "system";
    language: string;
  };
  status: "active" | "inactive" | "suspended";
}

interface Account {
  userId: string;
  type: "personal" | "business";
  name: string;
  status: "active" | "inactive";
  identitySettings: {
    username: string;
    domain: string;
    prefix?: string;
    suffix?: string;
  };
  businessDetails?: {
    companyName: string;
    registrationNumber: string;
    type: string;
  };
}

interface Wallet {
  accountId: string;
  type: "spending" | "savings" | "multisig";
  name: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  networkIdentities: any; // Simplified for brevity
}

interface Mapping {
  originalId: string;
  convexId: string;
}

async function readJsonlFile(filePath: string): Promise<any[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content
    .trim()
    .split('\n')
    .map(line => JSON.parse(line));
}

async function migrateData() {
  try {
    console.log('Starting data migration...');

    // 1. Import Users
    console.log('Reading users data...');
    const usersData: User[] = await readJsonlFile(path.join(__dirname, '../convex/users.jsonl'));
    
    console.log('Importing users...');
    const userMappings: Mapping[] = [];
    for (const user of usersData) {
      const result = await client.mutation(api.users.importUser, user);
      userMappings.push({
        originalId: user.clerkId,
        convexId: result
      });
    }
    console.log(`Imported ${userMappings.length} users`);

    // 2. Import Accounts
    console.log('Reading accounts data...');
    const accountsData: Account[] = await readJsonlFile(path.join(__dirname, '../convex/accounts.jsonl'));
    
    console.log('Importing accounts with updated user IDs...');
    const accountMappings: Mapping[] = [];
    for (const account of accountsData) {
      const userMapping = userMappings.find(m => m.originalId === account.userId);
      if (!userMapping) {
        console.warn(`No user mapping found for userId: ${account.userId}`);
        continue;
      }

      const accountWithConvexId = {
        ...account,
        userId: userMapping.convexId
      };

      const result = await client.mutation(api.accounts.importAccount, accountWithConvexId);
      accountMappings.push({
        originalId: account.userId, // Original account ID
        convexId: result
      });
    }
    console.log(`Imported ${accountMappings.length} accounts`);

    // 3. Import Wallets
    console.log('Reading wallets data...');
    const walletsData: Wallet[] = await readJsonlFile(path.join(__dirname, '../convex/wallets.jsonl'));
    
    console.log('Importing wallets with updated account IDs...');
    let importedWallets = 0;
    for (const wallet of walletsData) {
      const accountMapping = accountMappings.find(m => m.originalId === wallet.accountId);
      if (!accountMapping) {
        console.warn(`No account mapping found for accountId: ${wallet.accountId}`);
        continue;
      }

      const walletWithConvexId = {
        ...wallet,
        accountId: accountMapping.convexId
      };

      await client.mutation(api.wallets.importWallet, walletWithConvexId);
      importedWallets++;
    }
    console.log(`Imported ${importedWallets} wallets`);

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Add validation functions
function validateUserData(user: User): boolean {
  // Add validation logic
  return true;
}

function validateAccountData(account: Account): boolean {
  // Add validation logic
  return true;
}

function validateWalletData(wallet: Wallet): boolean {
  // Add validation logic
  return true;
}

// Execute migration
migrateData()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 