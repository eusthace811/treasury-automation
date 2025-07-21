'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Clock, CheckCircle, XCircle, Circle } from 'lucide-react';
import type { Message } from '@upstash/qstash';

interface QueueTabProps {
  messages: Message[];
  loading: boolean;
  onRefresh: () => void;
}

type MessageStatus = 'all' | 'created' | 'active' | 'delivered' | 'failed' | 'retry';

const statusIcons = {
  created: Circle,
  active: Clock,
  delivered: CheckCircle,
  failed: XCircle,
  retry: RefreshCw,
};

const statusColors = {
  created: 'text-gray-500 bg-gray-100',
  active: 'text-blue-600 bg-blue-100',
  delivered: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
  retry: 'text-yellow-600 bg-yellow-100',
};

export function QueueTab({ messages, loading, onRefresh }: QueueTabProps) {
  const [statusFilter, setStatusFilter] = useState<MessageStatus>('all');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>(messages);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredMessages(messages);
    } else {
      setFilteredMessages(
        messages.filter(message => message.state === statusFilter)
      );
    }
  }, [messages, statusFilter]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    const IconComponent = statusIcons[status as keyof typeof statusIcons] || Circle;
    return <IconComponent className="h-3 w-3" />;
  };

  const getStatusColor = (status: string) => {
    return statusColors[status as keyof typeof statusColors] || 'text-gray-500 bg-gray-100';
  };

  const truncateBody = (body: string, maxLength: number = 100) => {
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-9" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
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
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MessageStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="retry">Retry</SelectItem>
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

      {filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground text-center space-y-4">
              <div>
                <p className="text-lg font-medium">No messages available</p>
                <p className="text-sm mt-2">
                  QStash does not provide a messages listing API. Messages are processed individually.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md">
                <p className="text-blue-800 font-medium text-sm mb-2">Alternative: Check Schedules</p>
                <p className="text-blue-600 text-xs">
                  View the "Schedules" tab to see active treasury rule schedules. 
                  Each schedule represents recurring message processing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMessages.map((message) => (
            <Card key={message.messageId}>
              <CardHeader>
                <CardTitle className="text-lg flex justify-between items-start">
                  <span className="font-mono text-sm">{message.messageId}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(message.state)}`}>
                    {getStatusIcon(message.state)}
                    {message.state}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Destination</h4>
                    <p className="text-sm font-mono break-all">{message.url}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Method</h4>
                    <p className="text-sm font-mono">{message.method || 'POST'}</p>
                  </div>
                </div>
                
                {message.body && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Body Preview</h4>
                    <div className="bg-muted rounded-md p-3">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                        {truncateBody(message.body)}
                      </pre>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Created</h4>
                    <p className="text-sm">{formatTimestamp(message.createdAt)}</p>
                  </div>
                  {message.scheduleId && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Schedule ID</h4>
                      <p className="text-sm font-mono">{message.scheduleId}</p>
                    </div>
                  )}
                </div>

                {message.nextDelivery && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-1">Next Delivery</h4>
                      <p className="text-sm">{formatTimestamp(message.nextDelivery)}</p>
                    </div>
                    {message.retried !== undefined && (
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Retry Count</h4>
                        <p className="text-sm">{message.retried} attempts</p>
                      </div>
                    )}
                  </div>
                )}

                {message.callback && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-1">Callback URL</h4>
                    <p className="text-sm font-mono break-all text-muted-foreground">{message.callback}</p>
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