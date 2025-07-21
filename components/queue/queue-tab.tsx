'use client';

import { useEffect, useState } from 'react';
// CardTitle
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
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
  const [expandedBodies, setExpandedBodies] = useState<Set<string>>(new Set());

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

  const formatBody = (body: string): string => {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(body);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // If not JSON, check if it's base64
      const isBase64 =
        /^[A-Za-z0-9+/]*={0,2}$/.test(body) && body.length % 4 === 0;

      if (isBase64 && body.length > 20) {
        try {
          const decoded = atob(body);
          try {
            const parsed = JSON.parse(decoded);
            return JSON.stringify(parsed, null, 2);
          } catch {
            return decoded;
          }
        } catch {
          return body;
        }
      }

      return body;
    }
  };

  const toggleBodyExpansion = (messageId: string) => {
    setExpandedBodies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const getBodyPreview = (body: string, messageId: string) => {
    const formattedBody = formatBody(body);
    const isExpanded = expandedBodies.has(messageId);

    if (isExpanded || formattedBody.length <= 150) {
      return formattedBody;
    }
    return `${formattedBody.substring(0, 150)}...`;
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
        <div className="space-y-3">
          {filteredLogs.map((log, index) => {
            const messageId = log.messageId || `log-${index}`;
            const isBodyExpanded = expandedBodies.has(messageId);
            const formattedBody = log.body ? formatBody(log.body) : '';
            const shouldShowToggle = formattedBody.length > 150;

            return (
              <Card
                key={`${messageId}-${
                  // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                  index
                }`}
                className="border-l-4 border-l-purple-500"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">
                      ID: {messageId}
                    </span>
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(log.state || log.status)}`}
                      >
                        {getStatusIcon(log.state || log.status)}
                        {log.state || log.status}
                      </span>
                      {/* <span className="text-xs text-muted-foreground">
                        {log.createdAt ? formatTimestamp(log.createdAt) : 'N/A'}
                      </span> */}
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
                        {log.url || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Method:
                      </span>
                      <p className="font-mono text-xs mt-1">
                        {log.method || 'POST'}
                      </p>
                    </div>
                    {log.scheduleId && (
                      <div>
                        <span className="font-medium text-muted-foreground">
                          Schedule ID:
                        </span>
                        <p className="font-mono text-xs mt-1">
                          {log.scheduleId}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Body Preview */}
                  {log.body && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-muted-foreground">
                          RULE INSTRUCTION
                        </span>
                        {shouldShowToggle && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBodyExpansion(messageId)}
                            className="h-6 px-2 text-xs"
                          >
                            {isBodyExpanded ? (
                              <>
                                <ChevronUp className="size-3 mr-1" />
                                Collapse
                              </>
                            ) : (
                              <>
                                <ChevronDown className="size-3 mr-1" />
                                Expand
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="border rounded-lg p-3">
                        <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed text-left">
                          {getBodyPreview(log.body, messageId)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Additional Info */}
                  {(log.nextDelivery ||
                    log.retried !== undefined ||
                    log.callback ||
                    log.error) && (
                    <div className="border-t pt-4 space-y-3">
                      {log.nextDelivery && (
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-muted-foreground">
                            Next Delivery:
                          </span>
                          <span className="text-xs">
                            {formatTimestamp(log.nextDelivery)}
                          </span>
                        </div>
                      )}

                      {log.retried !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-muted-foreground">
                            Retry Count:
                          </span>
                          <span className="text-xs">
                            {log.retried} attempts
                          </span>
                        </div>
                      )}

                      {log.callback && (
                        <div>
                          <span className="font-medium text-sm text-muted-foreground">
                            Callback URL:
                          </span>
                          <p className="font-mono text-xs mt-1 break-all text-muted-foreground">
                            {log.callback}
                          </p>
                        </div>
                      )}

                      {log.error && (
                        <div>
                          <span className="font-medium text-sm text-red-600">
                            Error Details:
                          </span>
                          <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-1">
                            <pre className="text-xs text-red-800 overflow-x-auto whitespace-pre-wrap">
                              {log.error}
                            </pre>
                          </div>
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
