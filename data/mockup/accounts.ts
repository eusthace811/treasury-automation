export interface Account {
  id: string;
  name: string;
  type: string;
  address: string;
  chainId: number;
  currency: string;
  balance: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  description: string;
  isActive: boolean;
}

export interface AccountsData {
  accounts: Account[];
}

export const accountsData: AccountsData = {
  accounts: [
    {
      id: 'cd7efb8f-9029-46c9-aea4-e95891d0c060',
      name: 'Operating Account',
      type: 'EOA',
      address: '0x742d35Cc60C27826C4B0A2c8a5e2A8F34E0b2A1C',
      chainId: 1,
      currency: 'USDC',
      balance: 1245000.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
      description: 'Primary operating funds for daily expenses',
      isActive: true,
    },
    {
      id: 'e17ba4aa-17f5-4fba-a964-aec90421a07c',
      name: 'Reserve Fund',
      type: 'EOA',
      address: '0x8A3e5F9B7C2D1E6A4B8C9D0E1F2A3B4C5D6E7F8A',
      chainId: 1,
      currency: 'USDC',
      balance: 850000.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
      description: 'Emergency reserves - maintain 6 months runway',
      isActive: true,
    },
    {
      id: 'f9632918-4000-45aa-af13-843267061763',
      name: 'Sales Revenue',
      type: 'EOA',
      address: '0x1B4E7D8A2C5F9E3B6A7D8E9F0A1B2C3D4E5F6A7B',
      chainId: 1,
      currency: 'USDC',
      balance: 324500.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
      description: 'Incoming sales revenue before allocation',
      isActive: true,
    },
    {
      id: 'd912840e-e827-42ab-9cda-c816589dd4b7',
      name: 'Profit Sharing Pool',
      type: 'EOA',
      address: '0x5C8F2A6B9D3E7A1B4C7D0E3F6A9B2C5D8E1F4A7B',
      chainId: 1,
      currency: 'USDC',
      balance: 156000.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
      description:
        'Quarterly profit distribution to founders, holds the profits to be split',
      isActive: true,
    },
    {
      id: 'b04c1530-500c-4f00-9bca-e92a838d2698',
      name: 'Payroll Processing',
      type: 'EOA',
      address: '0x9E2F5A8B1C4D7A0B3E6F9A2C5D8E1F4A7B0C3D6E',
      chainId: 1,
      currency: 'USDC',
      balance: 125000.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
      description: 'Temporary holding for monthly payroll',
      isActive: true,
    },
    {
      id: '9857bd48-026d-4bcc-99dd-0766fe884a7e',
      name: 'Growth Investment Fund',
      type: 'EOA',
      address: '0x7A0B3D6E9F2C5A8B1D4E7F0A3B6C9D2E5F8A1B4C',
      chainId: 1,
      currency: 'USDC',
      balance: 75000.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
      description: 'Marketing and expansion investments',
      isActive: true,
    },
  ],
};
