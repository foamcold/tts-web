import { notification } from 'antd';

// 创建一个可变的持有者，以便在应用初始化时注入上下文实例
export const notificationHolder = {
  instance: notification,
};