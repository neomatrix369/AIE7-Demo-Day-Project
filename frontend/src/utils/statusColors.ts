// Status Color System
// Ranking: POOR (1) < NEEDS WORK (2) < GOOD (3) < EXCELLENT (4)

export type StatusType = 'POOR' | 'NEEDS WORK' | 'NEEDS_WORK' | 'GOOD' | 'EXCELLENT';

export interface StatusColorScheme {
  primary: string;      // Main background color
  secondary: string;    // Border/outline color
  text: string;         // Text color
  light: string;        // Light background variant
  dark: string;         // Dark background variant
}

export const STATUS_COLORS: Record<StatusType, StatusColorScheme> = {
  'POOR': {
    primary: '#dc3545',      // Red
    secondary: '#c82333',
    text: '#ffffff',
    light: '#f8d7da',
    dark: '#721c24'
  },
  'NEEDS WORK': {
    primary: '#ffc107',      // Yellow/Orange
    secondary: '#e0a800',
    text: '#212529',
    light: '#fff3cd',
    dark: '#856404'
  },
  'NEEDS_WORK': {
    primary: '#ffc107',      // Yellow/Orange (alias)
    secondary: '#e0a800',
    text: '#212529',
    light: '#fff3cd',
    dark: '#856404'
  },
  'GOOD': {
    primary: '#17a2b8',      // Blue
    secondary: '#138496',
    text: '#ffffff',
    light: '#d1ecf1',
    dark: '#0c5460'
  },
  'EXCELLENT': {
    primary: '#28a745',      // Green
    secondary: '#1e7e34',
    text: '#ffffff',
    light: '#d4edda',
    dark: '#155724'
  }
};

export const getStatusColor = (status: string): string => {
  const normalizedStatus = status.toUpperCase() as StatusType;
  return STATUS_COLORS[normalizedStatus]?.primary || '#6c757d';
};

export const getStatusColorScheme = (status: string): StatusColorScheme => {
  const normalizedStatus = status.toUpperCase() as StatusType;
  return STATUS_COLORS[normalizedStatus] || STATUS_COLORS['NEEDS WORK'];
};

export const getStatusRank = (status: string): number => {
  const statusRanks: Record<StatusType, number> = {
    'POOR': 1,
    'NEEDS WORK': 2,
    'NEEDS_WORK': 2,
    'GOOD': 3,
    'EXCELLENT': 4
  };
  const normalizedStatus = status.toUpperCase() as StatusType;
  return statusRanks[normalizedStatus] || 2;
};

export const isStatusImprovement = (beforeStatus: string, afterStatus: string): boolean => {
  const beforeRank = getStatusRank(beforeStatus);
  const afterRank = getStatusRank(afterStatus);
  return afterRank > beforeRank;
};

export const getStatusImprovementDirection = (beforeStatus: string, afterStatus: string): 'improved' | 'declined' | 'unchanged' => {
  const beforeRank = getStatusRank(beforeStatus);
  const afterRank = getStatusRank(afterStatus);
  
  if (afterRank > beforeRank) return 'improved';
  if (afterRank < beforeRank) return 'declined';
  return 'unchanged';
};
