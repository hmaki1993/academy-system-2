import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.epicgym.app',
  appName: 'Skippy Toes Q8',
  webDir: 'dist',
  android: {
    useLegacyBridge: true,
    allowMixedContent: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#FF3B30",
      presentationOptions: ["badge", "sound", "alert"]
    }
  },
};

export default config;
