'use client';

import { createContext, useContext, useState } from 'react';
import useSWR from 'swr';
import type { Chat } from '@/lib/db/schema';
import type { TreasuryRuleData } from '@/lib/treasury/schema';
import { fetcher } from '@/lib/utils';

interface RuleTestState {
  isTestSidebarOpen: boolean;
  setIsTestSidebarOpen: (open: boolean) => void;
  ruleData: TreasuryRuleData | null;
  isRuleLoaded: boolean;
  hasRule: boolean;
  chatData: Chat | null;
}

const RuleTestContext = createContext<RuleTestState | null>(null);

export function useRuleTest() {
  const context = useContext(RuleTestContext);
  if (!context) {
    throw new Error('useRuleTest must be used within a RuleTestProvider');
  }
  return context;
}

interface RuleTestProviderProps {
  children: React.ReactNode;
  chatId: string;
}

export function RuleTestProvider({ children, chatId }: RuleTestProviderProps) {
  const [isTestSidebarOpen, setIsTestSidebarOpen] = useState(false);

  // Fetch chat data including rule data
  const {
    data: chatData,
    isLoading,
    error,
  } = useSWR<Chat>(chatId ? `/api/chat/${chatId}/data` : null, fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds to catch new rules
    revalidateOnFocus: true,
    onError: (err) => {
      console.error('Failed to fetch chat data:', err);
    },
  });

  const ruleData = chatData?.ruleData
    ? (chatData.ruleData as TreasuryRuleData)
    : null;
  const isRuleLoaded = !isLoading && !error;
  const hasRule = Boolean(ruleData && isRuleLoaded);

  const value: RuleTestState = {
    isTestSidebarOpen,
    setIsTestSidebarOpen,
    ruleData,
    isRuleLoaded,
    hasRule,
    chatData: chatData || null,
  };

  return (
    <RuleTestContext.Provider value={value}>
      {children}
    </RuleTestContext.Provider>
  );
}
