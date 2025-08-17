import { StorageAdapter } from './StorageAdapter';
import { BrowserStorage } from './BrowserStorage';
import { FileSystemStorage } from './FileSystemStorage';

export const isVercelDeployment = (): boolean => {
  // Check deployment environment
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'vercel') {
    return true;
  }
  
  // Check if running in browser and hostname contains vercel
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('vercel.app') || 
           window.location.hostname.includes('.vercel.app');
  }
  
  return false;
};

export const createStorageAdapter = (): StorageAdapter => {
  if (isVercelDeployment()) {
    return new BrowserStorage();
  }
  return new FileSystemStorage();
};

export type { StorageAdapter, ExperimentData } from './StorageAdapter';
export { BrowserStorage } from './BrowserStorage';
export { FileSystemStorage } from './FileSystemStorage';