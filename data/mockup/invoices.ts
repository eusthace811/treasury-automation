export interface Invoice {
  id: string;
  vendorName: string;
  vendorAddress: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  dueDate: number;
  invoiceDate: number;
  approved: boolean;
  approvedBy: string | null;
  approvedAt: number | null;
  priority: string;
  recurring: boolean;
  recurringFrequency: string | null;
  tags: string[];
  status: 'paid' | 'unpaid' | 'overdue' | 'cancelled';
}

export interface InvoicesData {
  invoices: Invoice[];
}

export const invoicesData: InvoicesData = {
  invoices: [
    // Contractor invoices (majority)
    {
      id: 'bf1a8a3e-0459-4956-a238-19de2d7e8e64',
      vendorName: 'Alex Rodriguez',
      vendorAddress: '0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F',
      amount: 3400.0,
      currency: 'USDC',
      description: 'Frontend development - July 2024 (40 hours)',
      category: 'development',
      dueDate: 1721692800,
      invoiceDate: 1721088000,
      approved: true,
      approvedBy: 'mike.torres@techflow.com',
      approvedAt: 1721174400,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['frontend', 'development', 'contractor'],
      status: 'unpaid',
    },
    {
      id: '171a5929-dc4f-476f-8166-2d52e8f0d92a',
      vendorName: 'Jordan Thompson',
      vendorAddress: '0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A',
      amount: 2250.0,
      currency: 'USDC',
      description: 'UI/UX design work - July 2024 (30 hours)',
      category: 'design',
      dueDate: 1721692800,
      invoiceDate: 1721088000,
      approved: true,
      approvedBy: 'lisa.park@techflow.com',
      approvedAt: 1721174400,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['design', 'ui', 'ux', 'contractor'],
      status: 'unpaid',
    },
    {
      id: 'be0a296c-09a1-4691-adef-3be23ea96141',
      vendorName: 'Taylor Kim',
      vendorAddress: '0x7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A6B',
      amount: 1650.0,
      currency: 'USDC',
      description: 'Content writing - Blog posts and docs (30 hours)',
      category: 'content',
      dueDate: 1721952000,
      invoiceDate: 1721347200,
      approved: false,
      approvedBy: null,
      approvedAt: null,
      priority: 'low',
      recurring: false,
      recurringFrequency: null,
      tags: ['content', 'writing', 'contractor'],
      status: 'unpaid',
    },
    {
      id: 'contractor-004-aug-2024',
      vendorName: 'Alex Rodriguez',
      vendorAddress: '0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F',
      amount: 1700.0,
      currency: 'USDC',
      description: 'Frontend development - August 2024 (20 hours)',
      category: 'development',
      dueDate: 1722556800,
      invoiceDate: 1722211200,
      approved: true,
      approvedBy: 'mike.torres@techflow.com',
      approvedAt: 1722297600,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['frontend', 'development', 'contractor'],
      status: 'unpaid',
    },
    {
      id: 'contractor-005-aug-2024',
      vendorName: 'Jordan Thompson',
      vendorAddress: '0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A',
      amount: 1125.0,
      currency: 'USDC',
      description: 'UI design updates - August 2024 (15 hours)',
      category: 'design',
      dueDate: 1722556800,
      invoiceDate: 1722211200,
      approved: true,
      approvedBy: 'lisa.park@techflow.com',
      approvedAt: 1722297600,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['design', 'ui', 'contractor'],
      status: 'unpaid',
    },
    // One service invoice (approved)
    {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      vendorName: 'AWS',
      vendorAddress: '0x0000000000000000000000000000000000000000',
      amount: 8450.0,
      currency: 'USDC',
      description: 'Cloud infrastructure - July 2024',
      category: 'infrastructure',
      dueDate: 1721692800,
      invoiceDate: 1721088000,
      approved: true,
      approvedBy: 'sarah.chen@techflow.com',
      approvedAt: 1721174400,
      priority: 'normal',
      recurring: true,
      recurringFrequency: 'monthly',
      tags: ['cloud', 'infrastructure', 'recurring'],
      status: 'unpaid',
    },
    // One service invoice (not approved)
    {
      id: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
      vendorName: 'Salesforce',
      vendorAddress: '0x0000000000000000000000000000000000000000',
      amount: 4200.0,
      currency: 'USDC',
      description: 'CRM Enterprise licenses - Q3 2024',
      category: 'software',
      dueDate: 1721692800,
      invoiceDate: 1721088000,
      approved: false,
      approvedBy: null,
      approvedAt: null,
      priority: 'normal',
      recurring: true,
      recurringFrequency: 'quarterly',
      tags: ['software', 'crm', 'licenses'],
      status: 'overdue',
    },
  ],
};
