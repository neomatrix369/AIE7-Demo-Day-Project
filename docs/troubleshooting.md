# Troubleshooting Cloud Deployment

## Common Issues and Solutions

### 1. Frontend Can't Connect to Backend
**Symptoms:** API calls fail, WebSocket connection errors
**Solutions:**
- Verify `NEXT_PUBLIC_BACKEND_URL` is set correctly in Vercel
- Ensure Railway backend URL includes `https://` protocol
- Check Railway backend is deployed and responding at `/health` endpoint
- Redeploy frontend after changing environment variables

### 2. Backend Can't Connect to Qdrant
**Symptoms:** Vector database errors, document loading fails
**Solutions:**
- Verify Qdrant Cloud cluster is running
- Check `QDRANT_URL` includes `:6333` port
- Ensure `QDRANT_API_KEY` is correctly copied from Qdrant dashboard
- Test connection with curl: `curl -H "api-key: YOUR_KEY" YOUR_QDRANT_URL`

### 3. Data Files Not Found
**Symptoms:** "Data folder not found" errors, file discovery fails
**Solutions:**
- Ensure data files are in `backend/data/` folder (supports CSV, PDF, MD, TXT)
- Files in subdirectories are automatically discovered
- For Railway: verify `DATA_FOLDER=backend/data/` (not `../data/`)
- Check file permissions and paths in deployment logs
- Use Document Management UI to verify file discovery and ingestion status

### 4. WebSocket Connection Issues
**Symptoms:** Real-time updates not working
**Solutions:**
- Use Railway for backend (better WebSocket support than serverless)
- Check firewall/proxy settings
- Verify WebSocket URL matches backend URL with `wss://` protocol

### 5. Environment Variables Not Working
**Symptoms:** Application uses default values instead of configured ones
**Solutions:**
- For Vercel: Only `NEXT_PUBLIC_*` variables work in browser
- Redeploy after setting environment variables
- Check variable names match exactly (case-sensitive)
- For Railway: restart service after variable changes

### 6. Build/Deployment Failures
**Symptoms:** Deployment fails during build phase
**Solutions:**
- Ensure Node.js version compatibility (18+ or 22+)
- Check for missing dependencies in package.json
- Review deployment logs for specific error messages
- For Railway: verify Python dependencies in requirements.txt

### 7. Experiment Loading Issues
**Symptoms:** View Results button shows old experiments, experiments not found
**Solutions:**
- Use experiments page to load specific experiment before viewing results
- Check experiment filename matches in browser network tab
- Verify experiment metadata contains selected_documents field
- For memorable names: ensure name generator utils are available

### 8. Document Count Mismatches
**Symptoms:** Heatmap shows incorrect document counts
**Solutions:**
- Verify selected documents are properly tracked in experiment metadata
- Check document selection status in Document Management
- Only selected AND ingested documents should appear in counts
- Refresh corpus status if counts seem outdated

## Debugging Tips
- **Railway Logs**: Use `railway logs` or dashboard logs tab
- **Vercel Logs**: Check Functions tab in Vercel dashboard
- **Qdrant Health**: Visit `https://your-cluster.qdrant.io:6333/dashboard`
- **API Testing**: Test backend endpoints directly in browser
- **Experiment Debug**: Check browser console for WebSocket and API errors
- **Document Status**: Use Document Management UI to verify file processing status