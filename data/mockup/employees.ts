export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  payrollAddress: string;
  salary: number;
  currency: string;
  payFrequency: string;
  startDate: number;
  isActive: boolean;
  isFounder: boolean;
  equityPercent: number;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Contractor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  paymentAddress: string;
  hourlyRate: number;
  currency: string;
  maxHoursPerWeek: number;
  contractStart: number;
  contractEnd: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface EmployeesData {
  employees: Employee[];
  contractors: Contractor[];
}

export const employeesData: EmployeesData = {
  employees: [
    {
      id: "3e6d37fa-3ef2-4059-bc34-f51ebf083f20",
      name: "Sarah Chen",
      email: "sarah.chen@techflow.com",
      role: "CEO",
      department: "executive",
      payrollAddress: "0x1A2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B",
      salary: 15000.0,
      currency: "USDC",
      payFrequency: "monthly",
      startDate: 1609459200,
      isActive: true,
      isFounder: true,
      equityPercent: 45.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null
    },
    {
      id: "83f2c67c-8d7d-4686-a5b0-6a927db104e0",
      name: "Mike Torres",
      email: "mike.torres@techflow.com",
      role: "CTO",
      department: "engineering",
      payrollAddress: "0x2B3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C",
      salary: 14000.0,
      currency: "USDC",
      payFrequency: "monthly",
      startDate: 1609459200,
      isActive: true,
      isFounder: true,
      equityPercent: 35.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null
    },
    {
      id: "f367af56-8932-4f2e-b6a4-1c64f39b504e",
      name: "David Kim",
      email: "david.kim@techflow.com",
      role: "VP Operations",
      department: "operations",
      payrollAddress: "0x3C4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D",
      salary: 11000.0,
      currency: "USDC",
      payFrequency: "monthly",
      startDate: 1617235200,
      isActive: true,
      isFounder: false,
      equityPercent: 2.5,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null
    },
    {
      id: "b52a0675-84aa-4a8c-83a2-15a3a70758e7",
      name: "Lisa Park",
      email: "lisa.park@techflow.com",
      role: "Head of Marketing",
      department: "marketing",
      payrollAddress: "0x4D5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E",
      salary: 9500.0,
      currency: "USDC",
      payFrequency: "monthly",
      startDate: 1625097600,
      isActive: true,
      isFounder: false,
      equityPercent: 1.0,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null
    }
  ],
  contractors: [
    {
      id: "bf1a8a3e-0459-4956-a238-19de2d7e8e64",
      name: "Alex Rodriguez",
      email: "alex@freelancedev.com",
      specialty: "Frontend Development",
      paymentAddress: "0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F",
      hourlyRate: 85.0,
      currency: "USDC",
      maxHoursPerWeek: 20,
      contractStart: 1704067200,
      contractEnd: 1767225600,
      isActive: true,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null
    },
    {
      id: "171a5929-dc4f-476f-8166-2d52e8f0d92a",
      name: "Jordan Thompson",
      email: "jordan@designstudio.co",
      specialty: "UI/UX Design",
      paymentAddress: "0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A",
      hourlyRate: 75.0,
      currency: "USDC",
      maxHoursPerWeek: 15,
      contractStart: 1711929600,
      contractEnd: 1767225600,
      isActive: true,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null
    },
    {
      id: "be0a296c-09a1-4691-adef-3be23ea96141",
      name: "Taylor Kim",
      email: "taylor@contentpro.net",
      specialty: "Content Writing",
      paymentAddress: "0x7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B",
      hourlyRate: 55.0,
      currency: "USDC",
      maxHoursPerWeek: 10,
      contractStart: 1698796800,
      contractEnd: 1767225600,
      isActive: false,
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null
    }
  ]
};