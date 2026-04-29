export class NotificationService {
  static async requestPermission() {
    if (!('Notification' in window)) {
      console.log('Trình duyệt không hỗ trợ thông báo.');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  static async sendNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/Lexi_logo.svg',
        ...options,
      });
    }
    return null;
  }

  static async scheduleDailyReminder() {
    // This is a simple implementation. In a real PWA, you might use Service Workers
    // for more reliable scheduling, but for now we'll use a simple check on app load.
    const lastReminder = localStorage.getItem('lexiai_last_reminder');
    const today = new Date().toDateString();

    if (lastReminder !== today) {
      const permitted = await this.requestPermission();
      if (permitted) {
        this.sendNotification('Nhiệm vụ hàng ngày!', {
          body: 'Đừng quên hoàn thành các thử thách hôm nay để nhận XP nhé!',
          tag: 'daily-reminder'
        });
        localStorage.setItem('lexiai_last_reminder', today);
      }
    }
  }
}
