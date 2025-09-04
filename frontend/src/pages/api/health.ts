import { NextApiRequest, NextApiResponse } from 'next';

interface BackendStatus {
  status: string;
  backend_status?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ragcheck-frontend',
    version: '0.1.0',
    backend: {
      status: 'unknown'
    } as BackendStatus
  };

  // Optional: Check backend connectivity
  try {
    // Use internal Docker network hostname for container-to-container communication
    const backendUrl = process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'docker' 
      ? 'http://backend:8000'  // Internal Docker network
      : process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';  // External or development
      
    const response = await fetch(`${backendUrl}/health`, { 
      method: 'GET',
      timeout: 5000 
    } as any);
    
    if (response.ok) {
      const backendHealth = await response.json();
      healthStatus.backend = {
        status: 'connected',
        backend_status: backendHealth.status
      };
    } else {
      healthStatus.backend = { status: 'unreachable' };
      healthStatus.status = 'degraded';
    }
  } catch (error) {
    healthStatus.backend = { 
      status: 'unreachable', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
    healthStatus.status = 'degraded';
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
  return res.status(statusCode).json(healthStatus);
}