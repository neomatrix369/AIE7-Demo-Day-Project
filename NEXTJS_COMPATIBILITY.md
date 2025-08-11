# Next.js Compatibility Notes

## Important Compatibility Requirements

### Node.js Version Requirements
- **Recommended**: Node.js 18+ or 22+
- **Issue**: Next.js 14+ requires Node.js 18.17+, but some environments may have compatibility issues
- **Solution**: Use `nvm use default` twice to ensure proper Node.js version activation

### Next.js Version Selection
- **Final Version Used**: Next.js 12.3.4
- **React Version**: 17.0.2 (compatible with Next.js 12.x)
- **TypeScript**: 4.9.0

### Why Next.js 12.3.4?
1. **Compatibility**: Works reliably with various Node.js environments
2. **Stability**: Mature version with fewer dependency conflicts
3. **Build Success**: Reliable build process without complex configuration

### Known Issues Resolved

#### 1. Next.js 14 Compatibility Issues
```bash
# Error: Unexpected token ?
const { env, stdout } = ((_globalThis = globalThis) == null ? void 0 : _globalThis.process) ?? {};
```
**Solution**: Downgraded to Next.js 12.3.4

#### 2. TypeScript Module Resolution
```bash
# Error: Argument for '--moduleResolution' option must be: 'node', 'classic', 'node16', 'nodenext'
```
**Solution**: Updated tsconfig.json to use `"moduleResolution": "node"`

#### 3. Next.js Configuration Issues
```bash
# Error: Failed to load next.config.js - Not supported
```
**Solution**: Removed next.config.js and used environment-based API URL configuration

### Final Working Configuration

#### package.json
```json
{
  "dependencies": {
    "next": "12.3.4",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "axios": "^0.27.2"
  },
  "devDependencies": {
    "@types/node": "^16",
    "@types/react": "^17",
    "@types/react-dom": "^17",
    "eslint": "^8.0.0",
    "eslint-config-next": "12.3.4",
    "typescript": "^4.9.0"
  }
}
```

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "ES6"],
    "moduleResolution": "node",
    "jsx": "preserve"
  }
}
```

#### API Configuration
```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:8000/api';
```

### Setup Instructions

1. **Ensure correct Node.js version**:
   ```bash
   nvm use default  # Run twice if needed
   node --version   # Should show 18+ or 22+
   ```

2. **Install dependencies**:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json  # If reinstalling
   npm install
   ```

3. **Test build**:
   ```bash
   npm run build  # Should complete successfully
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

### Troubleshooting

#### Build Failures
- Always remove `node_modules` and `package-lock.json` when changing Node.js versions
- Ensure using the correct Node.js version with `nvm use default`
- Check that all dependencies are compatible versions

#### WebSocket Support
- WebSocket connections work directly to `ws://localhost:8000` regardless of Next.js version
- No proxy configuration needed for WebSocket in this setup

#### API Calls
- Development: Direct calls to `http://localhost:8000/api`
- Production: Relative calls to `/api` (requires reverse proxy setup)

## Remember for Future Next.js Projects
1. Check Node.js compatibility first
2. Use `nvm use default` (twice) for proper Node.js activation  
3. Start with stable Next.js versions (12.x) for reliability
4. Remove `node_modules` when switching Node.js versions
5. Test build process early to catch compatibility issues