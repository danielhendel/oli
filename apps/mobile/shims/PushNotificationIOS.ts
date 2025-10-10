// apps/mobile/shims/PushNotificationIOS.ts
type PermissionStatus = { alert: boolean; badge: boolean; sound: boolean };

const PushNotificationIOS = {
  addEventListener: (_event: string, _handler: (...args: unknown[]) => void) => {},
  removeEventListener: (_event: string, _handler: (...args: unknown[]) => void) => {},
  requestPermissions: async (): Promise<PermissionStatus> => ({
    alert: true,
    badge: true,
    sound: true,
  }),
  abandonPermissions: () => {},
  presentLocalNotification: (_config?: unknown) => {},
  scheduleLocalNotification: (_config?: unknown) => {},
  cancelAllLocalNotifications: () => {},
  getInitialNotification: async () => null,
};

export default PushNotificationIOS;
