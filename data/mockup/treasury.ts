export interface Treasury {
  id: string;
  name: string;
  industry: string;
  foundedAt: number;
  headquarters: string;
  employees: number;
  totalAssets: number;
  monthlyBurnRate: number;
  lastUpdated: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  runway: number;
}

export interface TreasuryData {
  treasury: Treasury;
}

export const treasuryData: TreasuryData = {
  treasury: {
    id: '60f8c6ec-7b3e-4dc3-b876-a7d23a4a5f9d',
    name: 'Treasury Challenge',
    industry: 'SaaS',
    foundedAt: 1609459200,
    headquarters: 'San Francisco, CA',
    employees: 4,
    totalAssets: 2850000.0,
    monthlyBurnRate: 285000.0,
    lastUpdated: 1721260800,
    revenue: 324500.0,
    expenses: 287650.5,
    netProfit: 36849.5,
    runway: 10.0,
  },
};
