'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleTab } from '@/components/queue/schedule-tab';
import { QueueTab } from '@/components/queue/queue-tab';
import type { Schedule, Message } from '@upstash/qstash';

export default function QueuePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = async () => {
    try {
      setSchedulesLoading(true);
      setError(null);
      
      const response = await fetch('/api/qstash/schedules');
      if (!response.ok) {
        throw new Error(`Failed to fetch schedules: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch schedules');
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      setMessagesLoading(true);
      setError(null);
      
      const response = await fetch('/api/qstash/messages');
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchMessages();
  }, []);

  const handleRefreshSchedules = () => {
    fetchSchedules();
  };

  const handleRefreshMessages = () => {
    fetchMessages();
  };

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Queue Management</h1>
          <p className="text-lg text-muted-foreground">
            View and manage your treasury automation queue
          </p>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Queue Data</h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button 
            onClick={() => {
              fetchSchedules();
              fetchMessages();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Queue Management</h1>
        <p className="text-lg text-muted-foreground">
          View and manage your treasury automation queue
        </p>
      </div>

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedules">
            Schedules ({schedules.length})
          </TabsTrigger>
          <TabsTrigger value="queue">
            Queue ({messages.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedules" className="mt-6">
          <ScheduleTab 
            schedules={schedules}
            loading={schedulesLoading}
            onRefresh={handleRefreshSchedules}
          />
        </TabsContent>
        
        <TabsContent value="queue" className="mt-6">
          <QueueTab 
            messages={messages}
            loading={messagesLoading}
            onRefresh={handleRefreshMessages}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}