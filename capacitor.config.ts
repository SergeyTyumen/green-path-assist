import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sergeytyumen.greenpathassist',
  appName: 'ParkConstructionCRM',
  webDir: 'dist',
  server: {
    url: 'https://767c6d43-3165-4cde-8b7e-e09c311e0d68.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false
    }
  }
};

export default config;