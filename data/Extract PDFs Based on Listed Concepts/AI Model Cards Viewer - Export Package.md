# AI Model Cards Viewer - Export Package

## Overview
This is the AI Model Cards Viewer application - a comprehensive web application for viewing and comparing frontier AI models with their specifications, benchmark scores, and routing guidance.

## Version Information
- **Version**: 2.0 (Updated August 2025)
- **Models Included**: 10 latest frontier AI models
- **Last Updated**: August 24, 2025
- **Framework**: React + Vite + Tailwind CSS

## Included Models
1. **GPT-5** (OpenAI) - GPQA: 89.4, HLE: 42.0
2. **Grok 4** (xAI) - GPQA: 88.9, HLE: 44.4
3. **o3-preview** (OpenAI) - GPQA: 87.7, HLE: 24.9
4. **Gemini 2.5 Pro 06-05** (Google) - GPQA: 86.4, HLE: 21.6
5. **Claude 3.7 Sonnet** (Anthropic) - GPQA: 84.8
6. **Claude Opus 4** (Anthropic) - GPQA: 83.3
7. **GPT-OSS-120B** (OpenAI) - HLE: 19.0 [Open Source]
8. **GPT-OSS-20B** (OpenAI) - HLE: 17.3 [Open Source]
9. **DeepSeek-V3.1-Base** (DeepSeek) - HLE: 29.8 [Open Source]
10. **Qwen3-235B-A22B** (Alibaba) - GPQA: 81.1 [Open Source]

## Features
- **Interactive Model Cards**: Detailed specifications and capabilities
- **PDF Viewer Integration**: Direct access to official model documentation
- **Advanced Filtering**: Search by provider, license, capabilities
- **Benchmark Comparison**: GPQA and HLE scores displayed
- **Routing Guide**: Decision framework for model selection
- **Responsive Design**: Works on desktop and mobile

## File Structure
```
ai-model-cards-viewer/
├── dist/                    # Built application (ready to deploy)
│   ├── index.html
│   └── assets/
├── src/                     # Source code
│   ├── App.jsx             # Main application component
│   ├── data/models.js      # Model database
│   ├── components/         # React components
│   └── ...
├── public/                 # Static assets
└── package.json           # Dependencies and scripts
```

## Deployment Options

### Option 1: Static Hosting
Upload the contents of the `dist/` folder to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3 + CloudFront
- Any web server

### Option 2: Local Development
1. Install Node.js (v18+)
2. Run `npm install` in the project directory
3. Run `npm run dev` for development server
4. Run `npm run build` to create production build

### Option 3: Docker Deployment
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

## Customization
- **Add New Models**: Edit `src/data/models.js`
- **Update Styling**: Modify `src/App.css` or Tailwind classes
- **Add Features**: Extend React components in `src/components/`

## Data Sources
Model information compiled from:
- Official model cards and documentation
- LifeArchitect.ai benchmark rankings
- Provider announcements and research papers
- Open source repositories

## License
This application code is provided as-is. Individual model information is sourced from respective providers and subject to their terms.

## Support
For questions about the application structure or customization, refer to the React and Vite documentation.

---
Generated: August 24, 2025

