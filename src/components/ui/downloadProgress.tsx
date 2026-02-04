import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pause, Play, X, Clock, RefreshCw } from 'lucide-react';
import type { DownloadTask } from '@/utils/batchDownloader';

interface DownloadProgressProps {
  tasks: Map<string, DownloadTask>;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  isActive: boolean;
}

interface TaskItemProps {
  task: DownloadTask;
  onRetry?: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onRetry }) => {
  const { t } = useTranslation();
  const getStatusIcon = () => {
    switch (task.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'downloading':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <RefreshCw className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'pending':
        return t('downloadProgress.pending');
      case 'downloading':
        return t('downloadProgress.downloading');
      case 'completed':
        return t('downloadProgress.completed');
      case 'failed':
        return t('downloadProgress.failed');
      case 'paused':
        return t('downloadProgress.paused');
      default:
        return t('downloadProgress.unknown');
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-4 bg-white rounded-md shadow-sm mb-2">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-shrink-0">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">
            {task.item.name || `${task.item.type}-${task.item.id}`}
          </div>
          <div className="text-xs text-gray-500">
            {getStatusText()}
            {task.error && ` - ${task.error}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        <div className="w-32">
          <Progress value={task.progress} className="h-2" />
        </div>
        <div className="text-xs text-gray-500 min-w-[40px] text-right">
          {task.progress.toFixed(0)}%
        </div>
        {task.status === 'failed' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onRetry}
            title={t('downloadProgress.retry')}
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  tasks,
  onCancel,
  onPause,
  onResume,
  isActive,
}) => {
  const { t } = useTranslation();
  if (!isActive || tasks.size === 0) {
    return null;
  }

  const tasksArray = Array.from(tasks.values());
  const totalProgress = tasksArray.reduce((sum, task) => sum + task.progress, 0) / tasksArray.length;
  const isDownloading = tasksArray.some(task => task.status === 'downloading');
  const isPaused = tasksArray.some(task => task.status === 'paused');
  const isCompleted = tasksArray.every(task => task.status === 'completed');
  const isFailed = tasksArray.every(task => task.status === 'failed');

  return (
    <div className="fixed bottom-4 right-4 w-80 max-w-[90vw] bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{t('downloadProgress.title')}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onCancel}
            title={t('downloadProgress.cancel')}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="p-4 max-h-64 overflow-y-auto">
        {tasksArray.map(task => (
          <TaskItem key={task.id} task={task} />
        ))}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900">{t('downloadProgress.overallProgress')}</span>
          <span className="text-sm text-gray-500">
            {totalProgress.toFixed(0)}%
          </span>
        </div>
        <Progress value={totalProgress} className="h-2 mb-4" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={isDownloading ? onPause : onResume}
              disabled={isCompleted || isFailed}
            >
              {isDownloading ? (
                <>
                  <Pause className="h-3 w-3 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Resume
                </>
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={onCancel}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DownloadProgress;
