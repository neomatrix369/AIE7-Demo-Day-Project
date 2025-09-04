// Generic API proxy for all backend endpoints

export default async function handler(req, res) {
  // Skip health endpoint which is handled by Next.js API route
  if (req.query.proxy[0] === 'health') {
    return res.status(404).json({ error: 'Not found' });
  }

  try {
    // Determine backend URL based on environment
    let backendUrl;
    
    if (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'docker') {
      backendUrl = 'http://backend:8000';
    } else if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/+$/, '');
    } else {
      backendUrl = 'http://localhost:8000';
    }

    // Construct the target URL
    const path = req.query.proxy.join('/');
    const queryString = new URLSearchParams(req.query).toString().replace(/proxy=[^&]+&?/g, '').replace(/&$/, '');
    const targetUrl = `${backendUrl}/api/${path}${queryString ? `?${queryString}` : ''}`;

    // Prepare request options
    const requestOptions = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      },
    };

    // Add body for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // For file uploads, we need to handle form data differently
        requestOptions.body = JSON.stringify(req.body);
      } else {
        requestOptions.body = JSON.stringify(req.body);
      }
    }

    // Make the proxy request
    const response = await fetch(targetUrl, requestOptions);
    
    // Handle different response types
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Return response with same status code
    return res.status(response.status).json(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to connect to backend service',
      message: error.message 
    });
  }
}