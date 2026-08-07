import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zalize.zhenti',
  appName: '真题工坊',
  webDir: 'dist-h5',
  android: {
    allowMixedContent: false
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#3D7FFF',
      overlaysWebView: false
    }
  }
};

export default config;
