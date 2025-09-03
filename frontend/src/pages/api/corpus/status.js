// API proxy for corpus status endpoint

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Determine backend URL based on environment
    let backendUrl;
    
    if (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'docker') {
      // Docker internal network
      backendUrl = 'http://backend:8000';
    } else if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      // External backend URL
      backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, '');
    } else {
      // Default to localhost for development
      backendUrl = 'http://localhost:8000';
    }

    const response = await fetch(`${backendUrl}/api/corpus/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    // Return the data with the same status code from backend
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to connect to backend service',
      message: error.message 
    });
  }
}