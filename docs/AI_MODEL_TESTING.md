# AI Model Testing with RagCheck

This feature extends RagCheck to support testing RAG systems with AI model documentation instead of student loan documents.

## Overview

The AI model testing feature allows you to:
- Test RAG quality using AI model documentation (GPT-5, Grok 4, Claude, DeepSeek, etc.)
- Generate questions from multiple perspectives (researchers, engineers, product managers, etc.)
- Evaluate how well your corpus answers technical questions about AI models

## Setup

### 1. Enable AI Model Mode

Set the environment variable in your `.env` file:

```bash
USE_AI_MODEL_MODE=true
```

When enabled, the system will:
- Load AI model questions for all three question categories (LLM, RAGAS, AI Model)
- Use AI model PDFs as the corpus
- Focus all testing on AI model documentation

### 2. AI Model PDFs

The system includes documentation for the following AI models:
- GPT-5 (OpenAI)
- Grok 4 (xAI)
- GPT-OSS-120B and GPT-OSS-20B (OpenAI open-source)
- DeepSeek-V3.1
- Qwen3-235B
- o3-preview (OpenAI)
- Claude models (if PDFs are added)
- Gemini models (if PDFs are added)

PDFs are stored in: `backend/data/`

### 3. Question Sets

Three AI model question sets are available:

#### LLM Generated Questions (`ai-models-llm.json`)
- 35 questions across 7 roles
- Focus: General understanding and use cases
- Roles: AI Researcher, ML Engineer, Product Manager, Data Scientist, Startup Founder, AI Ethicist, Academic Researcher

#### RAGAS Generated Questions (`ai-models-ragas.json`)
- 16 technical evaluation questions across 4 roles
- Focus: Deep technical verification and compliance
- Roles: Technical Evaluator, Benchmark Analyst, Compliance Officer, Security Auditor

#### AI Model Questions (`ai-models.json`)
- 20 questions across 4 roles
- Focus: Practical implementation and deployment
- Roles: AI Researcher, ML Engineer, Product Manager, Data Scientist

## Usage

### Running an Experiment

1. Navigate to the Questions page to see all available AI model questions
2. Click "Configure Experiment" to set up your test parameters
3. Select which question groups to include (LLM, RAGAS, AI Model)
4. Run the experiment to evaluate your RAG system

### Interpreting Results

The quality scores (0-10 scale) indicate how well the corpus answers each question:
- **8-10**: Strong match - question is well-answered by the corpus
- **6-8**: Moderate match - partial information available
- **4-6**: Weak match - limited relevant content
- **0-4**: Poor match - question cannot be answered from corpus

Low scores often indicate:
- Missing documentation for specific models
- Questions asking for information not in the PDFs
- Gaps in the corpus that need to be filled

### Gap Analysis

The Gap Analysis feature identifies:
- Which types of questions score poorly
- What content might be missing from your corpus
- Recommendations for improving coverage

## Adding New Models

To add documentation for new AI models:

1. Add PDF files to `backend/data/`
2. Restart the backend to reload the corpus
3. The new PDFs will automatically be indexed and available for testing

## Switching Back to Student Loan Mode

To return to the original student loan testing:

1. Set `USE_AI_MODEL_MODE=false` in `.env`
2. Restart the backend
3. The system will load student loan questions and documents

## File Structure

```
backend/
├── data/
│   ├── questions/
│   │   ├── ai-models.json          # Base AI model questions
│   │   ├── ai-models-llm.json      # LLM category AI questions
│   │   ├── ai-models-ragas.json    # RAGAS category AI questions
│   │   ├── llm-generated.json      # Original student loan LLM questions
│   │   └── ragas-generated.json    # Original student loan RAGAS questions
│   └── *.pdf                        # AI model documentation PDFs
```

## Technical Details

The backend (`main.py`) checks the `USE_AI_MODEL_MODE` environment variable at startup:
- When `true`: Loads AI model questions for all categories
- When `false`: Loads original student loan questions
- The AI model questions endpoint (`/api/questions/ai-models`) is always available

The frontend automatically displays all three question categories when available, with appropriate styling:
- Blue for LLM questions
- Green for RAGAS questions  
- Orange for AI Model questions

## Future Enhancements

Potential improvements for future PRs:
- Experiment comparison and tracking
- Automatic question generation from corpus
- Model-specific question filtering
- Performance benchmarking across experiments
- Export/import experiment results