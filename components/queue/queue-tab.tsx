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
import { RefreshCw, Clock, CheckCircle, XCircle, Circle } from 'lucide-react';
// import type { Message } from '@upstash/qstash';

interface QueueTabProps {
  logs: any[];
  loading: boolean;
  onRefresh: () => void;
}

type LogStatus =
  | 'all'
  | 'CREATED'
  | 'ACTIVE'
  | 'RETRY'
  | 'ERROR'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCEL_REQUESTED'
  | 'CANCELLED';

const statusIcons = {
  CREATED: Circle,
  ACTIVE: Clock,
  RETRY: RefreshCw,
  ERROR: XCircle,
  IN_PROGRESS: Clock,
  DELIVERED: CheckCircle,
  FAILED: XCircle,
  CANCEL_REQUESTED: RefreshCw,
  CANCELLED: XCircle,
};

const statusColors = {
  CREATED: 'text-gray-500 bg-gray-100',
  ACTIVE: 'text-blue-600 bg-blue-100',
  RETRY: 'text-yellow-600 bg-yellow-100',
  ERROR: 'text-red-600 bg-red-100',
  IN_PROGRESS: 'text-blue-600 bg-blue-100',
  DELIVERED: 'text-green-600 bg-green-100',
  FAILED: 'text-red-600 bg-red-100',
  CANCEL_REQUESTED: 'text-orange-600 bg-orange-100',
  CANCELLED: 'text-gray-600 bg-gray-100',
};

export function QueueTab({ logs, loading, onRefresh }: QueueTabProps) {
  const [statusFilter, setStatusFilter] = useState<LogStatus>('all');
  const [filteredLogs, setFilteredLogs] = useState<any[]>(logs);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredLogs(logs);
    } else {
      const filtered = logs.filter((log) => {
        // Handle both 'state' and 'status' properties for compatibility
        const logState = log.state || log.status;
        // Case-insensitive comparison for robustness
        return (
          logState && logState.toUpperCase() === statusFilter.toUpperCase()
        );
      });

      setFilteredLogs(filtered);
    }
  }, [logs, statusFilter]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    const IconComponent =
      statusIcons[status as keyof typeof statusIcons] || Circle;
    return <IconComponent className="size-3" />;
  };

  const getStatusColor = (status: string) => {
    return (
      statusColors[status as keyof typeof statusColors] ||
      'text-gray-500 bg-gray-100'
    );
  };

  const truncateBody = (body: string, maxLength = 100) => {
    // Try to decode if it looks like base64
    const isBase64 =
      /^[A-Za-z0-9+/]*={0,2}$/.test(body) && body.length % 4 === 0;

    let displayBody = body;
    if (isBase64 && body.length > 20) {
      try {
        const decoded = atob(body);
        // Check if decoded content is valid JSON
        try {
          const parsed = JSON.parse(decoded);
          displayBody = JSON.stringify(parsed, null, 2);
        } catch {
          displayBody = decoded;
        }
      } catch {
        // If decoding fails, use original body
        displayBody = body;
      }
    }

    if (displayBody.length <= maxLength) return displayBody;
    return `${displayBody.substring(0, maxLength)}...`;
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
          onValueChange={(value) => setStatusFilter(value as LogStatus)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Logs</SelectItem>
            <SelectItem value="CREATED">Created</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="RETRY">Retry</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCEL_REQUESTED">Cancel Requested</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
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

      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground text-center space-y-4">
              <div>
                <p className="text-lg font-medium">No logs available</p>
                <p className="text-sm mt-2">
                  {statusFilter === 'all'
                    ? 'No logs have been generated yet.'
                    : `No logs with status "${statusFilter}" found.`}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md">
                <p className="text-blue-800 font-medium text-sm mb-2">Logs</p>
                <p className="text-blue-600 text-xs">
                  Logs show the execution history of your treasury automation
                  tasks. Each log entry represents a message processing attempt.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLogs.map((log, index) => (
            <Card key={`${log.messageId || 'log'}-${index}`}>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-start">
                  <span className="font-mono text-sm">
                    ID: {log.messageId || `Log ${index + 1}`}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium ${getStatusColor(log.state || log.status)}`}
                  >
                    {getStatusIcon(log.state || log.status)}
                    {log.state || log.status}
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
                      {log.url || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Method
                    </h4>
                    <p className="text-sm font-mono">{log.method || 'POST'}</p>
                  </div>
                </div>

                {log.body && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Body Preview
                    </h4>
                    <div className="bg-muted rounded-md p-3">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {truncateBody(log.body, 300)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Created
                    </h4>
                    <p className="text-sm">
                      {log.createdAt ? formatTimestamp(log.createdAt) : 'N/A'}
                    </p>
                  </div> */}
                  {log.scheduleId && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">
                        Schedule ID
                      </h4>
                      <p className="text-sm font-mono">{log.scheduleId}</p>
                    </div>
                  )}
                </div>

                {log.nextDelivery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">
                        Next Delivery
                      </h4>
                      <p className="text-sm">
                        {formatTimestamp(log.nextDelivery)}
                      </p>
                    </div>
                    {log.retried !== undefined && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">
                          Retry Count
                        </h4>
                        <p className="text-sm">{log.retried} attempts</p>
                      </div>
                    )}
                  </div>
                )}

                {log.callback && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Callback URL
                    </h4>
                    <p className="text-sm font-mono break-all text-muted-foreground">
                      {log.callback}
                    </p>
                  </div>
                )}

                {log.error && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">
                      Error Details
                    </h4>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <pre className="text-xs text-red-800 overflow-x-auto whitespace-pre-wrap">
                        {log.error}
                      </pre>
                    </div>
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
