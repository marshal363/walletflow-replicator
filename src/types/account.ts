export interface Account {
  id: string;
  type: 'PERSONAL' | 'JOINT';
  balance: number;
  isSelected: boolean;
  name: string;
  username: string;
} 