import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sergeytyumen.greenpathassist',
  appName: 'ParkConstructionCRM',
  webDir: 'dist',
  server: {
    url: 'https://green-path-assist.lovable.app/?forceHideBadge=true', // слэш перед ? обязателен
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
