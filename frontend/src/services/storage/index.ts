import { StorageAdapter } from './StorageAdapter';
import { BrowserStorage } from './BrowserStorage';
import { FileSystemStorage } from './FileSystemStorage';

export const isVercelDeployment = (): boolean => {
  const envVar = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown';
  
  // Check deployment environment
  if (envVar === 'vercel') {
    console.log('🌐 Deployment mode: Vercel (via NEXT_PUBLIC_DEPLOYMENT_ENV)');
    return true;
  }
  
  // Check if running in browser and hostname contains vercel
  if (typeof window !== 'undefined') {
    const isVercelHostname = hostname.includes('vercel.app') || hostname.includes('.vercel.app');
    if (isVercelHostname) {
      console.log('🌐 Deployment mode: Vercel (via hostname detection)');
      return true;
    }
  }
  
  console.log(`🌐 Deployment mode: Local (env: ${envVar || 'unset'}, hostname: ${hostname})`);
  return false;
};

export const createStorageAdapter = (): StorageAdapter => {
  const isVercel = isVercelDeployment();
  
  if (isVercel) {
    console.log('💾 Storage adapter: BrowserStorage (localStorage)');
    return new BrowserStorage();
  }
  
  console.log('💾 Storage adapter: FileSystemStorage (backend API)');
  return new FileSystemStorage();
};

export type { StorageAdapter, ExperimentData } from './StorageAdapter';
export { BrowserStorage } from './BrowserStorage';
export { FileSystemStorage } from './FileSystemStorage';