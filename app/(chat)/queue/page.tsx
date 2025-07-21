'use client';

import { useEffect, useState } from 'react';
// import { redirect } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScheduleTab } from '@/components/queue/schedule-tab';
import { QueueTab } from '@/components/queue/queue-tab';
import type { Schedule } from '@upstash/qstash';

export default function QueuePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
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
      setError(
        err instanceof Error ? err.message : 'Failed to fetch schedules',
      );
      setSchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      setError(null);

      const response = await fetch('/api/qstash/logs');
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchLogs();
  }, []);

  const handleRefreshSchedules = () => {
    fetchSchedules();
  };

  const handleRefreshLogs = () => {
    fetchLogs();
  };

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Queue</h1>
          <p className="text-lg text-muted-foreground">
            View and manage your treasury automation queue
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium mb-2">
            Error Loading Queue Data
          </h3>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            type="button"
            onClick={() => {
              fetchSchedules();
              fetchLogs();
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
        <h1 className="text-3xl font-bold mb-2">Queue</h1>
        <p className="text-lg text-muted-foreground">
          View and manage your treasury automation queue
        </p>
      </div>

      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedules">
            Schedules ({schedules.length})
          </TabsTrigger>
          <TabsTrigger value="queue">Logs ({logs.length})</TabsTrigger>
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
            logs={logs}
            loading={logsLoading}
            onRefresh={handleRefreshLogs}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
