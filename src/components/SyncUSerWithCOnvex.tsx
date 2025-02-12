// Examplea making sure users Sync betwen Convex and Clerk

"use client"

import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useEffect, useState } from "react";
import { generateWallet } from "../lib/bitcoin";

function SyncUserWithConvex() {
    const { user, isLoaded } = useUser();
    const [isUserCreated, setIsUserCreated] = useState(false);
    const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);
    const createAccount = useMutation(api.accounts.importAccount);
    const createWallet = useMutation(api.wallets.importWallet);
    
    // Only query accounts after user is created
    const existingAccounts = useQuery(
        api.accounts.getAccountsByUser,
        isLoaded && user && isUserCreated ? { clerkId: user.id } : "skip"
    );

    useEffect(() => {
        if (!isLoaded || !user) return;

        const syncUser = async () => {
            try {
                // Create or update user in Convex
                const convexUser = await createOrUpdateUser({
                    clerkId: user.id,
                    email: user.primaryEmailAddress?.emailAddress || "",
                    username: user.username || undefined,
                    firstName: user.firstName || undefined,
                    lastName: user.lastName || undefined,
                    fullName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
                    profileImageUrl: user.imageUrl || undefined,
                    createdAt: (user.createdAt || new Date()).toISOString(),
                    lastSignInAt: (user.lastSignInAt || new Date()).toISOString(),
                    preferences: {
                        defaultCurrency: "USD",
                        notifications: true,
                        twoFactorEnabled: false,
                        theme: "system",
                        language: "en"
                    }
                });

                // Mark user as created to trigger account query
                if (convexUser) {
                    setIsUserCreated(true);
                }

                // If user has no accounts, create a default personal account and wallets
                if (convexUser && (!existingAccounts || existingAccounts.length === 0)) {
                    // Create personal account
                    const personalAccount = await createAccount({
                        userId: convexUser,
                        type: "personal",
                        name: "Personal Account",
                        status: "active",
                        identitySettings: {
                            username: user.username || user.id,
                            domain: "bitchat.com"
                        }
                    });

                    if (personalAccount) {
                        // Create spending wallet (Lightning)
                        await createWallet({
                            accountId: personalAccount,
                            type: "spending",
                            name: "Lightning Wallet",
                            balance: 0,
                            currency: "sats",
                            lastUpdated: new Date().toISOString(),
                            networkIdentities: {
                                type: "spending",
                                lightning: `${user.username || user.id}@bitchat.com`,
                                nostr: `${user.username || user.id}@bitchat.com`
                            }
                        });

                        // Create savings wallet (Bitcoin)
                        const { address, path } = generateWallet('savings');
                        await createWallet({
                            accountId: personalAccount,
                            type: "savings",
                            name: "Bitcoin Wallet",
                            balance: 0,
                            currency: "sats",
                            lastUpdated: new Date().toISOString(),
                            networkIdentities: {
                                type: "savings",
                                bitcoinAddress: address,
                                derivationPath: path
                            }
                        });
                    }
                }
            } catch (error) {
                console.error("Error syncing user with Convex:", error);
            }
        };

        syncUser();
    }, [user, isLoaded, createOrUpdateUser, createAccount, createWallet, existingAccounts]);

    return null;
}

export default SyncUserWithConvex;