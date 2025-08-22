import { useRouter } from 'next/router';
import { logNavigation } from '../utils/logger';

interface NavigationContext {
  component?: string;
  action?: string;
  data?: any;
}

export function usePageNavigation(fromLabel: string, defaultContext?: NavigationContext) {
  const router = useRouter();

  const goTo = async (path: string, toLabel?: string, context?: NavigationContext) => {
    logNavigation(fromLabel, toLabel || path, { ...defaultContext, ...context });
    await router.push(path);
  };

  const replace = async (path: string, toLabel?: string, context?: NavigationContext) => {
    logNavigation(fromLabel, toLabel || path, { ...defaultContext, ...context, action: 'REPLACE' });
    await router.replace(path);
  };

  const back = (context?: NavigationContext) => {
    logNavigation(fromLabel, 'BACK', { ...defaultContext, ...context, action: 'BACK' });
    router.back();
  };

  return { goTo, replace, back };
}

export default usePageNavigation;


