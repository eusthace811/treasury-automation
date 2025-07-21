'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { RefreshCw, Clock, CheckCircle, Circle } from 'lucide-react';
import type { Schedule } from '@upstash/qstash';

interface ScheduleTabProps {
  schedules: Schedule[];
  loading: boolean;
  onRefresh: () => void;
}

type ScheduleStatus = 'all' | 'active' | 'paused';

const statusIcons = {
  active: CheckCircle,
  paused: Circle,
};

const statusColors = {
  active: 'text-green-600 bg-green-100',
  paused: 'text-gray-600 bg-gray-100',
};

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

  const getStatusIcon = (status: string) => {
    const IconComponent =
      statusIcons[status as keyof typeof statusIcons] || CheckCircle;
    return <IconComponent className="size-3" />;
  };

  const getStatusColor = (status: string) => {
    return (
      statusColors[status as keyof typeof statusColors] ||
      'text-green-600 bg-green-100'
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="size-9" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card
            key={`skeleton-${
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
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {filteredSchedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground text-center space-y-4">
              <div>
                <p className="text-lg font-medium">No schedules found</p>
                <p className="text-sm mt-2">
                  {statusFilter === 'all'
                    ? 'No schedules have been created yet.'
                    : `No ${statusFilter} schedules found.`}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md">
                <p className="text-blue-800 font-medium text-sm mb-2">
                  Schedules
                </p>
                <p className="text-blue-600 text-xs">
                  Schedules define when your treasury automation tasks should
                  run. Each schedule represents a recurring job with a specific
                  cron pattern.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSchedules.map((schedule, index) => {
            const scheduleStatus = 'active'; // Assume active for now

            return (
              <Card
                key={`${schedule.scheduleId}-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  index
                }`}
                className="border-l-4 border-l-purple-500"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      ID: {schedule.scheduleId}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(scheduleStatus)}`}
                      >
                        {getStatusIcon(scheduleStatus)}
                        ACTIVE
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Main Info Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Destination:
                      </span>
                      <p className="font-mono text-xs mt-1 break-all">
                        {schedule.destination}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Schedule:
                      </span>
                      <p className="text-xs mt-1">
                        {cronToHuman(schedule.cron)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {schedule.cron}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Created:
                      </span>
                      <p className="text-xs mt-1">
                        {formatTimestamp(schedule.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {(schedule.retries || schedule.callback) && (
                    <div className="border-t pt-4 space-y-3">
                      {schedule.retries && (
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-muted-foreground">
                            Retry Count:
                          </span>
                          <span className="text-xs">
                            {schedule.retries} attempts
                          </span>
                        </div>
                      )}

                      {schedule.callback && (
                        <div>
                          <span className="font-medium text-sm text-muted-foreground">
                            Callback URL:
                          </span>
                          <p className="font-mono text-xs mt-1 break-all text-muted-foreground">
                            {schedule.callback}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
