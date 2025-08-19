# Cloud Deployment

## Prerequisites for Cloud Deployment

### 1. Qdrant Cloud Setup (Required for both platforms)
```bash
# Sign up for Qdrant Cloud at https://cloud.qdrant.io
# Create a cluster and note down:
# - Cluster URL (e.g., https://xyz-abc-123.eu-central.aws.cloud.qdrant.io:6333)
# - API Key (generated in the cluster dashboard)
```

## Hybrid Deployment (Recommended)
Deploy frontend to Vercel and backend to Railway for optimal performance:

### Step 1: Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize Railway project (in project root)
railway init

# Deploy backend
railway up
```

**Railway Environment Variables Configuration:**
Go to Railway Dashboard → Your Project → Variables and set:

| Variable | Value | Description |
|----------|-------|-------------|
| `QDRANT_URL` | `https://your-cluster.eu-central.aws.cloud.qdrant.io:6333` | Your Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | `your_qdrant_cloud_api_key` | API key from Qdrant Cloud dashboard |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key |
| `QDRANT_COLLECTION_NAME` | `student_loan_corpus` | Vector collection name |
| `DATA_FOLDER` | `data/` | Path to data files in Railway |
| `BACKEND_HOST` | `0.0.0.0` | Allow external connections |
| `BACKEND_PORT` | `8000` | Port for FastAPI (Railway auto-detects) |
| `VERCEL_FRONTEND_URL` | `https://xxxxxx.vercel.app` | Vercel frontend URL for CORS |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

**Generate Public Domain URL:**
1. Select deployed service in Railway dashboard
2. Go to Settings → Networking → Public Networking → Generate Domain
3. Set port to `8000` (FastAPI default)
4. Copy the generated domain (e.g., `https://xxxxx.railway.app`)

### Step 2: Deploy Frontend to Vercel

```bash
# Ensure correct Node.js version
source ~/.zshrc && nvm use default && nvm use default

# Deploy frontend to Vercel
vercel --yes
```

**Vercel Environment Variables Configuration:**
Go to Vercel Dashboard → Your Project → Settings → Environment Variables and set:

| Variable | Value | Environment | Description |
|----------|-------|-------------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | `https://xxxxx.railway.app/` | Production | Railway backend URL (from Step 1), ensure it trails with a `/` |
| `NEXT_PUBLIC_DEPLOYMENT_ENV` | `vercel` | Production | Enables browser storage adapter |
| `NEXT_PUBLIC_QDRANT_COLLECTION_NAME` | `student_loan_corpus` | Production | Collection name for frontend |

**Important Notes:**
- Only `NEXT_PUBLIC_*` variables are accessible in the browser
- Backend handles Qdrant/OpenAI connections, so frontend doesn't need those credentials
- Redeploy frontend after setting environment variables

**Benefits of Hybrid Deployment:**
- **Vercel Frontend**: Fast CDN, excellent Next.js support
- **Railway Backend**: Large Python dependencies, WebSocket support, no size limits

## Alternative: Full-Stack Railway Deployment

Deploy both frontend and backend to Railway as a single service:

```bash
# Deploy entire application to Railway
railway login
railway init
railway up
```

**Railway Environment Variables Configuration (Full-Stack):**
Go to Railway Dashboard → Your Project → Variables and set:

| Variable | Value | Description |
|----------|-------|-------------|
| `QDRANT_URL` | `https://your-cluster.eu-central.aws.cloud.qdrant.io:6333` | Your Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | `your_qdrant_cloud_api_key` | API key from Qdrant Cloud dashboard |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API key |
| `QDRANT_COLLECTION_NAME` | `student_loan_corpus` | Vector collection name |
| `DATA_FOLDER` | `backend/data/` | Path to data files |
| `BACKEND_HOST` | `0.0.0.0` | Allow external connections |
| `BACKEND_PORT` | `8000` | Port for FastAPI |
| `NEXT_PUBLIC_DEPLOYMENT_ENV` | `railway` | Enables browser storage adapter |
| `NEXT_PUBLIC_QDRANT_COLLECTION_NAME` | `student_loan_corpus` | Collection name for frontend |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

**Benefits of Full-Stack Railway:**
- **Single deployment**: Easier management, one domain
- **WebSocket support**: Better real-time features
- **No size limits**: Handle large Python dependencies
- **Automatic builds**: Deploys on git push

## Storage Adapters
The application automatically adapts storage based on deployment environment:
- **Local Development**: FileSystemStorage (saves to `experiments/` folder)
- **Cloud Deployment**: BrowserStorage (saves to browser localStorage)