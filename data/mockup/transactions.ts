export interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  amount: number;
  currency: string;
  fromAddress: string;
  toAddress: string;
  description: string;
  category: string;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
  gasUsed?: number;
  gasFee?: number;
  status: 'pending' | 'confirmed' | 'failed';
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TransactionsData {
  transactions: Transaction[];
}

export const transactionsData: TransactionsData = {
  transactions: []
};