export interface FinancialSnapshot {
  revenue: number;
  expenses: number;
  netProfit: number;
  burnRate: number;
  runway: number;
}

export interface YearToDateSnapshot {
  revenue: number;
  expenses: number;
  netProfit: number;
  avgMonthlyBurn: number;
  runway: number;
}

export interface TreasurySnapshot {
  currentMonth: FinancialSnapshot;
  lastMonth: FinancialSnapshot;
  yearToDate: YearToDateSnapshot;
}

export interface Treasury {
  id: string;
  name: string;
  industry: string;
  foundedAt: number;
  headquarters: string;
  fiscalYearEnd: string;
  employees: number;
  totalAssets: number;
  monthlyBurnRate: number;
  runway: number;
  lastUpdated: number;
  snapshot: TreasurySnapshot;
}

export interface TreasuryData {
  treasury: Treasury;
}

export const treasuryData: TreasuryData = {
  treasury: {
    id: "60f8c6ec-7b3e-4dc3-b876-a7d23a4a5f9d",
    name: "Treasury Challenge",
    industry: "SaaS",
    foundedAt: 1609459200,
    headquarters: "San Francisco, CA",
    fiscalYearEnd: "2025-12-31",
    employees: 4,
    totalAssets: 2850000.00,
    monthlyBurnRate: 285000.00,
    runway: 10.0,
    lastUpdated: 1721260800,
    snapshot: {
      currentMonth: {
        revenue: 324500.00,
        expenses: 287650.50,
        netProfit: 36849.50,
        burnRate: 285000.00,
        runway: 10.0
      },
      lastMonth: {
        revenue: 298750.00,
        expenses: 273200.00,
        netProfit: 25550.00,
        burnRate: 273200.00,
        runway: 10.4
      },
      yearToDate: {
        revenue: 2156000.00,
        expenses: 1847500.00,
        netProfit: 308500.00,
        avgMonthlyBurn: 263928.57,
        runway: 10.8
      }
    }
  }
};