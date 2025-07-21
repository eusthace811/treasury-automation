'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cronToHuman } from '@/lib/utils/cron';
import { RefreshCw } from 'lucide-react';
import type { Schedule } from '@upstash/qstash';

interface ScheduleTabProps {
  schedules: Schedule[];
  loading: boolean;
  onRefresh: () => void;
}

type ScheduleStatus = 'all' | 'active' | 'paused';

export function ScheduleTab({
  schedules,
  loading,
  onRefresh,
}: ScheduleTabProps) {
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus>('all');
  const [filteredSchedules, setFilteredSchedules] =
    useState<Schedule[]>(schedules);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredSchedules(schedules);
    } else {
      setFilteredSchedules(
        schedules.filter((schedule) => {
          // QStash schedules don't have a direct status field in the response
          // We'll assume active for now, but this could be enhanced based on actual API response
          return statusFilter === 'active';
        }),
      );
    }
  }, [schedules, statusFilter]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-9" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={`loading-skeleton-${
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              i
            }`}
          >
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ScheduleStatus)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schedules</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground text-center">
              <p className="text-lg font-medium">No schedules found</p>
              <p className="text-sm mt-2">
                {statusFilter === 'all'
                  ? 'No schedules have been created yet.'
                  : `No ${statusFilter} schedules found.`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSchedules.map((schedule) => (
            <Card key={schedule.scheduleId}>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-start">
                  <span className="font-mono text-sm">
                    ID: {schedule.scheduleId}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-sm font-medium bg-green-100 text-green-800">
                    ACTIVE
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Destination
                    </h4>
                    <p className="text-sm font-mono break-all">
                      {schedule.destination}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Schedule
                    </h4>
                    <p className="text-sm">{cronToHuman(schedule.cron)}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {schedule.cron}
                    </p>
                  </div>
                </div>

                {schedule.retries && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Retries
                    </h4>
                    <p className="text-sm">{schedule.retries} attempts</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Created
                    </h4>
                    <p className="text-sm">
                      {formatTimestamp(schedule.createdAt)}
                    </p>
                  </div>
                </div>

                {schedule.callback && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Callback URL
                    </h4>
                    <p className="text-sm font-mono break-all text-muted-foreground">
                      {schedule.callback}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
