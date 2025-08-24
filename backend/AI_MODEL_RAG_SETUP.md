# AI Model RAG System - Complete Setup & Testing Guide

## Overview
This guide shows how to use RagCheck to create a RAG system for AI model documentation, test retrieval quality, and identify gaps in your knowledge base.

## What You'll Build
A complete RAG quality assessment system that:
- Loads AI model PDFs (GPT-5, Grok 4, GPT-OSS, etc.)
- Chunks and embeds documents into Qdrant vector database
- Tests retrieval with role-based questions
- Measures quality scores (0-10 scale)
- Identifies gaps and provides recommendations

## Prerequisites Checklist
- [ ] Docker installed and running
- [ ] Python 3.8+ installed
- [ ] Node.js 18+ installed
- [ ] OpenAI API key
- [ ] AI model PDFs downloaded to `backend/data/model_cards/`

## Step 1: Environment Setup

### 1.1 Create .env file
```bash
cd /Users/tdeshane/Mani/AIE7-Demo-Day-Project
cp .env.example .env
```

### 1.2 Edit .env and add your OpenAI API key
```bash
# Edit .env and set:
OPENAI_API_KEY=your_actual_api_key_here
QDRANT_COLLECTION_NAME=ai_model_corpus  # Changed from student_loan_corpus
```

## Step 2: Start Qdrant Vector Database

```bash
# Run the setup script
./scripts/setup_qdrant.sh

# Or manually with Docker:
docker run -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

Verify Qdrant is running: http://localhost:6333/dashboard

## Step 3: Backend Setup

### 3.1 Install Python dependencies
```bash
cd backend

# Using uv (recommended):
uv venv && source .venv/bin/activate
uv pip install -r requirements.txt

# Or using pip:
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 3.2 Update data configuration for AI models
The system will automatically load PDFs from `backend/data/model_cards/`

### 3.3 Start the backend server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend API available at: http://localhost:8000

## Step 4: Frontend Setup

```bash
# In a new terminal
cd frontend
npm install
npm run dev
```

Frontend available at: http://localhost:3000

## Step 5: Create Test Questions for AI Models

Create custom questions to test your RAG system's ability to retrieve AI model information.

### File: `backend/data/questions/ai-model-questions.json`
```json
{
  "AI Researcher": {
    "role-id": "ai-researcher",
    "role": "AI Researcher",
    "description": "Researcher comparing model capabilities and benchmarks",
    "questions": [
      {
        "text": "What is GPT-5's performance on the GPQA benchmark?",
        "focus": "benchmarks"
      },
      {
        "text": "How does Grok 4 compare to GPT-5 on reasoning tasks?",
        "focus": "comparison"
      },
      {
        "text": "Which model has the best HLE score?",
        "focus": "benchmarks"
      },
      {
        "text": "What are the memory requirements for GPT-OSS-120B?",
        "focus": "technical"
      },
      {
        "text": "Which models support tool-calling capabilities?",
        "focus": "capabilities"
      }
    ]
  },
  "ML Engineer": {
    "role-id": "ml-engineer",
    "role": "ML Engineer",
    "description": "Engineer looking for deployment options",
    "questions": [
      {
        "text": "Can GPT-OSS-20B run on a 16GB GPU?",
        "focus": "deployment"
      },
      {
        "text": "What is the architecture of DeepSeek-V3.1?",
        "focus": "architecture"
      },
      {
        "text": "Which open-source models are available with Apache 2.0 license?",
        "focus": "licensing"
      },
      {
        "text": "What's the context window size for Qwen3-235B?",
        "focus": "technical"
      },
      {
        "text": "How many experts are active in GPT-OSS-120B's MoE architecture?",
        "focus": "architecture"
      }
    ]
  },
  "Product Manager": {
    "role-id": "product-manager",
    "role": "Product Manager",
    "description": "PM evaluating models for production use",
    "questions": [
      {
        "text": "Which model is best for real-time search capabilities?",
        "focus": "use-cases"
      },
      {
        "text": "What safety measures does Claude 3.7 Sonnet have?",
        "focus": "safety"
      },
      {
        "text": "Which models support multimodal inputs?",
        "focus": "capabilities"
      },
      {
        "text": "What is the cost-effectiveness of DeepSeek compared to others?",
        "focus": "economics"
      },
      {
        "text": "Which model should I use for complex coding tasks?",
        "focus": "use-cases"
      }
    ]
  },
  "Data Scientist": {
    "role-id": "data-scientist",
    "role": "Data Scientist",
    "description": "Data scientist evaluating model performance",
    "questions": [
      {
        "text": "What mathematical reasoning capabilities does o3-preview have?",
        "focus": "capabilities"
      },
      {
        "text": "How does Gemini 2.5 Pro perform on multimodal tasks?",
        "focus": "performance"
      },
      {
        "text": "What's the difference between thinking and non-thinking modes in DeepSeek?",
        "focus": "features"
      },
      {
        "text": "Which model has the highest GPQA score?",
        "focus": "benchmarks"
      },
      {
        "text": "What are the strengths of Claude Opus 4 for research tasks?",
        "focus": "capabilities"
      }
    ]
  }
}
```

## Step 6: Using the 5-Screen Wizard

### Screen 1: Dashboard
- View corpus statistics
- Check number of AI model documents loaded
- Monitor chunk count and vector database health

### Screen 2: Questions
- Load the AI model questions
- Review questions by role (AI Researcher, ML Engineer, etc.)
- Select which questions to test

### Screen 3: Experiment
- Click "Run Experiment" to test retrieval
- Watch real-time progress via WebSocket
- System retrieves relevant chunks for each question

### Screen 4: Results
- View quality scores (0-10) for each question
- Analyze role-based performance
- Identify which questions have poor retrieval

### Screen 5: Heatmap
- Visualize retrieval quality across all questions
- Identify patterns and gaps
- See which document chunks are underutilized

## Step 7: Analyzing Results

### Quality Score Interpretation
- **Good (≥7.0)**: Excellent retrieval, highly relevant chunks found
- **Weak (5.0-6.9)**: Acceptable but could be improved
- **Poor (<5.0)**: Poor retrieval, knowledge gap identified

### Common Issues and Solutions

1. **Low scores for benchmark questions**
   - Solution: Ensure PDFs contain benchmark tables
   - Add supplementary benchmark comparison documents

2. **Poor retrieval for technical specs**
   - Solution: Check if model cards include technical details
   - Consider adding architecture diagrams or specs

3. **Gaps in use case information**
   - Solution: Add practical guides or case studies
   - Include implementation examples

## Step 8: Gap Analysis

The system provides automatic gap analysis:

### View Gap Analysis
Navigate to: http://localhost:3000/gap-analysis

### What it shows:
- **Low Score Queries**: Questions scoring below 5.0
- **Uncovered Topics**: Roles with poor average performance
- **Weak Coverage Areas**: Systematic gaps in knowledge
- **Recommendations**: Actionable improvements

### Example Recommendations:
- "Add more content about model benchmarks and performance metrics"
- "Include deployment guides for open-source models"
- "Add safety and alignment documentation for frontier models"

## Testing Different Scenarios

### Scenario 1: Model Comparison
Test questions comparing different models:
- "How does GPT-5 compare to Grok 4?"
- "Which model is faster for inference?"

### Scenario 2: Technical Implementation
Test deployment and architecture questions:
- "How to deploy GPT-OSS locally?"
- "What's the memory requirement for each model?"

### Scenario 3: Use Case Matching
Test application-specific questions:
- "Best model for code generation?"
- "Which model for real-time applications?"

## Monitoring & Optimization

### Check Vector Database
```bash
# View Qdrant dashboard
open http://localhost:6333/dashboard

# Check collection info via API
curl http://localhost:6333/collections/ai_model_corpus
```

### Optimize Chunking
Edit `backend/config/settings.py`:
```python
CHUNK_SIZE = 750  # Adjust based on your PDFs
CHUNK_OVERLAP = 100  # Increase for better context
```

### Add More Documents
Place additional PDFs in `backend/data/model_cards/` and restart the backend.

## Troubleshooting

### Issue: Low quality scores across all questions
**Solution**: Check if PDFs are being loaded correctly
```bash
ls -la backend/data/model_cards/*.pdf
```

### Issue: Qdrant connection error
**Solution**: Ensure Docker is running
```bash
docker ps | grep qdrant
```

### Issue: OpenAI API errors
**Solution**: Verify API key in .env file
```bash
grep OPENAI_API_KEY .env
```

## Next Steps

1. **Expand Knowledge Base**: Add more model documentation, research papers, benchmarks
2. **Create Domain-Specific Questions**: Test specific aspects of AI models
3. **Fine-tune Retrieval**: Adjust chunk size, overlap, and embedding model
4. **Build Custom Queries**: Create questions based on your specific use cases
5. **Export Results**: Save experiments for tracking improvement over time

## Summary

You now have a complete RAG quality assessment system for AI model documentation:
- ✅ AI model PDFs loaded and indexed
- ✅ Vector search with Qdrant
- ✅ Quality scoring system
- ✅ Gap analysis and recommendations
- ✅ Interactive visualization

This system helps you:
- Understand what information retrieves well
- Identify knowledge gaps
- Improve your AI model documentation corpus
- Make informed decisions about model selection