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
  approvedBy: string | null;
  approvedAt: number | null;
  priority: string;
  recurring: boolean;
  recurringFrequency: string | null;
  tags: string[];
  status: 'pending' | 'paid' | 'approved' | 'cancelled';
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface InvoicesData {
  invoices: Invoice[];
}

export const invoicesData: InvoicesData = {
  invoices: [
    {
      id: 'bf1a8a3e-0459-4956-a238-19de2d7e8e64',
      vendorName: 'Alex Rodriguez',
      vendorAddress: '0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F',
      amount: 3400.0,
      currency: 'USDC',
      description: 'Frontend development (40 hours)',
      category: 'development',
      dueDate: 1721692800,
      invoiceDate: 1721088000,
      approvedBy: 'mike.torres@techflow.com',
      approvedAt: 1721174400,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['frontend', 'development', 'contractor'],
      status: 'approved',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: '171a5929-dc4f-476f-8166-2d52e8f0d92a',
      vendorName: 'Jordan Thompson',
      vendorAddress: '0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A',
      amount: 2250.0,
      currency: 'USDC',
      description: 'UI/UX design work (30 hours)',
      category: 'design',
      dueDate: 1721692800,
      invoiceDate: 1721088000,
      approvedBy: 'lisa.park@techflow.com',
      approvedAt: 1721174400,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['design', 'ui', 'ux', 'contractor'],
      status: 'approved',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
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
      approvedBy: null,
      approvedAt: null,
      priority: 'low',
      recurring: false,
      recurringFrequency: null,
      tags: ['content', 'writing', 'contractor'],
      status: 'pending',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: 'be0a296c-0111-4691-adef-3be23ea96141',
      vendorName: 'Alex Rodriguez',
      vendorAddress: '0x5E6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F',
      amount: 1700.0,
      currency: 'USDC',
      description: 'Frontend development (20 hours)',
      category: 'development',
      dueDate: 1722556800,
      invoiceDate: 1722211200,
      approvedBy: null,
      approvedAt: null,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['frontend', 'development', 'contractor'],
      status: 'pending',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: 'be0a296c-0112-4691-adef-3be23ea96141',
      vendorName: 'Jordan Thompson',
      vendorAddress: '0x6F7A8B9C0D1E2F3A4B5C6D7E8F9A0B1C2D3E4F5A',
      amount: 1125.0,
      currency: 'USDC',
      description: 'UI design updates (15 hours)',
      category: 'design',
      dueDate: 1722556800,
      invoiceDate: 1722211200,
      approvedBy: null,
      approvedAt: null,
      priority: 'normal',
      recurring: false,
      recurringFrequency: null,
      tags: ['design', 'ui', 'contractor'],
      status: 'pending',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
    {
      id: '8decb981-9dad-11d1-80b4-00c04fd430c8',
      vendorName: 'Acme Properties',
      vendorAddress: '0x0000000000000000000000000000000000000000',
      amount: 2500.0,
      currency: 'USDC',
      description: 'Office rent',
      category: 'rent',
      dueDate: 1721692800,
      invoiceDate: 1721088000,
      approvedBy: 'sarah.chen@techflow.com',
      approvedAt: 1721174400,
      priority: 'high',
      recurring: true,
      recurringFrequency: 'monthly',
      tags: ['office', 'rent', 'property'],
      status: 'approved',
      createdAt: 1721260800,
      updatedAt: 1752796800,
      deletedAt: null,
    },
  ],
};
