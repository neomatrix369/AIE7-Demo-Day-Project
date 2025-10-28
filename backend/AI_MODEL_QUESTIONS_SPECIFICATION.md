# AI Model Questions Specification

## Overview

This document specifies the design and implementation of AI model-specific questions for RAG quality assessment, transitioning RagCheck from student loan documentation to technical AI model documentation.

## Question Categories

### 1. LLM Questions (25 questions)
**Focus**: Model capabilities, benchmarks, and architecture
- Performance metrics (GPQA, HLE benchmarks)
- Technical specifications (context windows, parameters)
- Architecture details (transformer variants, attention mechanisms)
- Capability assessments (reasoning, coding, multimodal)

**Example Questions**:
```json
{
  "text": "What is GPT-5's performance on the GPQA benchmark?",
  "focus": "Benchmarks"
},
{
  "text": "What is the context window size for Gemini 2.5 Pro?", 
  "focus": "Technical Specs"
}
```

### 2. RAGAS Questions (21 questions)  
**Focus**: Safety, evaluation metrics, and robustness
- Safety measures and alignment techniques
- Adversarial robustness testing
- Evaluation methodologies
- Responsible AI considerations

**Example Questions**:
```json
{
  "text": "What safety measures are implemented in Claude 3.7?",
  "focus": "Safety"
},
{
  "text": "What specific adversarial robustness testing has been performed?",
  "focus": "Robustness"  
}
```

### 3. AI Model Questions (25 questions)
**Focus**: Technical specifications, training, and use cases
- Model family comparisons
- Training data and methodologies
- Licensing and commercial terms
- Real-world applications

**Example Questions**:
```json
{
  "text": "What are the licensing terms for GPT-OSS models?",
  "focus": "Licensing"
},
{
  "text": "How does DeepSeek V3.1 compare to other reasoning models?",
  "focus": "Comparisons"
}
```

## Model Coverage Matrix

| Model Family | LLM Qs | RAGAS Qs | AI Model Qs | Total | Coverage Focus |
|-------------|---------|-----------|-------------|-------|----------------|
| GPT-5 | 4 | 3 | 2 | 9 | Benchmarks, capabilities |
| Grok 4 | 2 | 1 | 0 | 3 | Real-time search, reasoning |
| DeepSeek | 2 | 1 | 1 | 4 | Hybrid reasoning modes |
| Qwen | 2 | 1 | 0 | 3 | MoE architecture |
| GPT-OSS | 2 | 1 | 1 | 4 | Open source licensing |
| Claude | 3 | 2 | 2 | 7 | Constitutional AI, safety |
| Gemini | 1 | 0 | 1 | 2 | Multimodal capabilities |
| O1/O3 | 2 | 1 | 0 | 3 | Reasoning methodology |

## Question Design Principles

### 1. Specificity Over Generality
- Target specific benchmarks, metrics, and features
- Avoid vague conceptual questions
- Reference concrete documentation elements

### 2. Retrievable Information
- Focus on facts likely to appear in technical docs
- Avoid questions requiring cross-document synthesis
- Target structured information (tables, specifications)

### 3. Gap Identification
- Include questions about known documentation weaknesses
- Test for missing technical details
- Probe abstract concepts (Constitutional AI, reasoning)

### 4. Balanced Coverage
- Distribute questions across model families
- Cover different aspects (performance, safety, technical)
- Include both strong and weak documentation areas

## Implementation Structure

### File Organization
```
backend/data/questions/
├── ai-models-llm.json      # 25 LLM-focused questions
├── ai-models-ragas.json    # 21 RAGAS-focused questions  
└── ai-models.json          # 25 general AI model questions
```

### JSON Format
```json
[
  {
    "role-id": "ai-researcher",
    "role": "AI Research Specialist",
    "questions": [
      {
        "text": "Question text here",
        "focus": "Category/Topic"
      }
    ]
  }
]
```

### Role Distribution
- **AI Research Specialist**: Technical performance and benchmarks
- **ML Engineer**: Implementation and architecture details
- **Safety Researcher**: Alignment and robustness testing
- **Product Manager**: Use cases and practical applications
- **Compliance Officer**: Licensing and regulatory aspects

## Expected Performance Patterns

### High-Performing Questions (Score 6-8)
- Specific benchmark queries
- License and commercial terms
- Well-documented technical specifications

### Medium-Performing Questions (Score 4-6)  
- Architecture details
- Training methodologies
- Capability comparisons

### Low-Performing Questions (Score 1-3)
- Abstract concepts (Constitutional AI)
- Cross-model reasoning
- Implicit information synthesis

## Integration with RagCheck

### Environment Variable Control
```bash
USE_AI_MODEL_MODE=true
```

### API Endpoints
- `/api/questions/llm` → AI model LLM questions
- `/api/questions/ragas` → AI model RAGAS questions
- `/api/questions/ai-model` → General AI model questions

### Frontend Display
- Orange-themed cards for visual distinction
- Category-specific grouping
- Experiment integration

## Quality Assessment Criteria

### Question Effectiveness Metrics
- **Retrieval Rate**: Percentage returning non-empty results
- **Relevance Score**: Average similarity to retrieved chunks
- **Gap Identification**: Low scores indicating documentation gaps

### Expected Baseline Performance
- **Overall Average**: 3.0-4.0 (identifying significant gaps)
- **Top Performers**: Grok, GPT-5, GPT-OSS (5.5-6.5)
- **Gap Indicators**: Claude, Gemini, O1 (1.5-2.5)

## Validation Results

Based on testing with 15 AI model PDFs (82.7 MB):
- **71 questions** successfully generated and categorized
- **Average quality score**: 3.6/10 (correctly identifying gaps)
- **Model family coverage**: 8 major AI model families
- **Documentation gaps identified**: 60% of technical specs not retrievable

## Future Enhancements

### Question Expansion
- Domain-specific categories (vision, NLP, robotics)
- Temporal questions (training dates, release timelines)
- Competitive analysis questions

### Dynamic Generation
- LLM-powered question synthesis from new PDFs
- Adaptive difficulty based on documentation quality
- User-customizable question templates

### Evaluation Improvements
- Ground truth answer validation
- Human expert scoring correlation
- Automated question quality assessment

This specification provides the foundation for comprehensive AI model documentation assessment using RagCheck's quality evaluation framework.