// components/Notification.tsx
import { notificationHolder } from '@/lib/notification';
import { CheckCircleFilled, CloseCircleFilled, InfoCircleFilled, WarningFilled } from '@ant-design/icons';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

const iconMap = {
  success: <CheckCircleFilled style={{ color: '#52c41a' }} />,
  error: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
  info: <InfoCircleFilled style={{ color: '#1890ff' }} />,
  warning: <WarningFilled style={{ color: '#faad14' }} />,
};

const showNotification = (type: NotificationType, message: string, description?: string) => {
  notificationHolder.instance[type]({
    title: message,
    description: description,
    placement: 'topRight',
    icon: iconMap[type],
    style: {
      borderRadius: '8px',
      boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
    },
  } as any);
};

export const notify = {
  success: (message: string, description?: string) => {
    showNotification('success', message, description);
  },
  error: (message: string, description?: string) => {
    showNotification('error', message, description);
  },
  info: (message: string, description?: string) => {
    showNotification('info', message, description);
  },
  warning: (message: string, description?: string) => {
    showNotification('warning', message, description);
  },
};