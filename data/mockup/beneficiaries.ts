export type Beneficiary = Employee | Contractor | Individual | Business;

export type BeneficiaryType =
  | 'employee'
  | 'contractor'
  | 'individual'
  | 'business';

interface BaseBeneficiary {
  id: string;
  name: string;
  email?: string;
  walletAddress: string;
  currency: string;
  tags: string[];
  status: string;
  type: BeneficiaryType;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

/** Existing Types with Type field added */
export interface Employee extends BaseBeneficiary {
  type: 'employee';
  role: string;
  department: string;
  salary: number;
  payFrequency: string;
  startDate: number;
  status:
    | 'pending'
    | 'onboarding'
    | 'active'
    | 'on_leave'
    | 'suspended'
    | 'resigned'
    | 'terminated'
    | 'retired'
    | 'contract_ended'
    | 'inactive'
    | 'deceased';
}

export interface Contractor extends BaseBeneficiary {
  type: 'contractor';
  role: string;
  hourlyRate: number;
  maxHoursPerWeek: number;
  contractStart: number;
  contractEnd: number;
  status:
    | 'pending'
    | 'active'
    | 'suspended'
    | 'contract_ended'
    | 'terminated'
    | 'inactive';
}

/** New Types */
export interface Individual extends BaseBeneficiary {
  type: 'individual';
  nationalId?: string;
  status: 'active' | 'inactive' | 'deceased';
}

export interface Business extends BaseBeneficiary {
  type: 'business';
  businessId: string;
  companyType: 'llc' | 'corp' | 'sole_prop' | 'non_profit' | string;
  contactName: string;
  contactPerson: string;
  status: 'active' | 'inactive' | 'dissolved';
}

export interface BeneficiariesData {
  employees: Employee[];
  contractors: Contractor[];
  individuals: Individual[];
  businesses: Business[];
}

export const beneficiariesData: BeneficiariesData = {
  employees: [
    {
      id: '3e6d37fa-3ef2-4059-bc34-f51ebf083f20',
      type: 'employee',
      name: 'Sarah Chen',
      email: 'sarah.chen@techflow.com',
      role: 'CEO',
      department: 'executive',
      walletAddress: '0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B',
      salary: 15000.0,
      currency: 'USDC',
      payFrequency: 'monthly',
      startDate: 1609459200,
      tags: ['founder'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: '83f2c67c-8d7d-4686-a5b0-6a927db104e0',
      type: 'employee',
      name: 'Mike Torres',
      email: 'mike.torres@techflow.com',
      role: 'CTO',
      department: 'engineering',
      walletAddress: '0x2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C',
      salary: 14000.0,
      currency: 'USDC',
      payFrequency: 'monthly',
      startDate: 1609459200,
      tags: ['founder'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: 'f367af56-8932-4f2e-b6a4-1c64f39b504e',
      type: 'employee',
      name: 'David Kim',
      email: 'david.kim@techflow.com',
      role: 'VP Operations',
      department: 'operations',
      walletAddress: '0x3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D',
      salary: 11000.0,
      currency: 'USDC',
      payFrequency: 'monthly',
      startDate: 1617235200,
      tags: ['employee'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: 'b52a0675-84aa-4a8c-83a2-15a3a70758e7',
      type: 'employee',
      name: 'Lisa Park',
      email: 'lisa.park@techflow.com',
      role: 'Head of Marketing',
      department: 'marketing',
      walletAddress: '0x4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E',
      salary: 9500.0,
      currency: 'USDC',
      payFrequency: 'monthly',
      startDate: 1625097600,
      tags: ['employee'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
  ],
  contractors: [
    {
      id: 'bf1a8a3e-0459-4956-a238-19de2d7e8e64',
      type: 'contractor',
      name: 'Alex Rodriguez',
      email: 'alex@freelancedev.com',
      role: 'Frontend Developer',
      walletAddress: '0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F',
      hourlyRate: 85.0,
      currency: 'USDC',
      maxHoursPerWeek: 20,
      contractStart: 1704067200,
      contractEnd: 1767225600,
      tags: ['contractor'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: '171a5929-dc4f-476f-8166-2d52e8f0d92a',
      type: 'contractor',
      name: 'Jordan Thompson',
      email: 'jordan@designstudio.co',
      role: 'UI/UX Designer',
      walletAddress: '0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A',
      hourlyRate: 75.0,
      currency: 'USDC',
      maxHoursPerWeek: 15,
      contractStart: 1711929600,
      contractEnd: 1767225600,
      tags: ['contractor'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: 'be0a296c-09a1-4691-adef-3be23ea96141',
      type: 'contractor',
      name: 'Taylor Kim',
      email: 'taylor@contentpro.net',
      role: 'Content Writer',
      walletAddress: '0x7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B',
      hourlyRate: 55.0,
      currency: 'USDC',
      maxHoursPerWeek: 10,
      contractStart: 1698796800,
      contractEnd: 1767225600,
      tags: ['contractor'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
  ],
  businesses: [
    {
      id: '171a5929-dc4f-4888-8166-2d52e8f0d92a',
      type: 'business',
      businessId: '14382498',
      companyType: 'llc',
      name: 'Acme Properties',
      contactName: 'Anthony Sanders',
      contactPerson: 'anthony@acme.com',
      walletAddress: '0x0000000000000000000000000000000000000000',
      currency: 'USDC',
      tags: ['business'],
      status: 'active',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
  ],
  individuals: [],
};
