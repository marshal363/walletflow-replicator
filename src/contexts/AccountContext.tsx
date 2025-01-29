import * as React from "react";

interface Account {
  type: "PERSONAL" | "JOINT";
  balance: number;
  isSelected: boolean;
}

interface AccountContextType {
  accounts: Account[];
  selectedAccount: Account["type"];
  setSelectedAccount: (type: Account["type"]) => void;
}

const defaultAccounts: Account[] = [
  { type: "PERSONAL", balance: 219.59, isSelected: true },
  { type: "JOINT", balance: 693.75, isSelected: false },
];

export const AccountContext = React.createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = React.useState<Account[]>(defaultAccounts);

  const setSelectedAccount = React.useCallback((type: Account["type"]) => {
    setAccounts((prevAccounts) =>
      prevAccounts.map((account) => ({
        ...account,
        isSelected: account.type === type,
      }))
    );
  }, []);

  const selectedAccount = accounts.find((account) => account.isSelected)?.type || "PERSONAL";

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccount,
        setSelectedAccount,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = React.useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}