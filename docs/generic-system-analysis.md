# Generic Gap Analysis System

## Overview

The gap analysis and recommendation system has been designed to be **completely generic** and work with any dataset, not just student loan data. This document explains how the system achieves this and what makes it universally applicable.

## ✅ Generic Components

### 1. **Quality Score Service** (`quality_score_service.py`)
- **Completely domain-agnostic**
- Works with any similarity scores (0-1) and converts to quality scores (0-10)
- Generic thresholds: GOOD (≥7.0), WEAK (≥5.0), POOR (<5.0)
- No hardcoded domain-specific logic

### 2. **Core Gap Analysis Logic** (`gap_analysis_service.py`)
- **Dynamic role/category detection** - uses `role_name` or `source` fields from experiment results
- **Generic performance thresholds** - based on quality scores, not domain knowledge
- **Universal recommendation generation** - works with any type of content gaps
- **No hardcoded topic patterns** - removed student loan specific keywords

### 3. **Frontend Components**
- **Generic display logic** - shows "Category" instead of "Role" 
- **Universal sorting** - by priority score, not domain-specific metrics
- **Flexible labeling** - adapts to any dataset structure

## 🔧 How It Works with Any Dataset

### Input Requirements
The system expects experiment results with these fields:
```json
{
  "question": "Any question text",
  "avg_quality_score": 7.5,  // or avg_similarity: 0.75
  "role_name": "Optional role/category",  // e.g., "Developer", "Customer", "Admin"
  "source": "llm"  // or "ragas" or any source identifier
}
```

### Automatic Category Detection
- **Uses `role_name`** if provided (e.g., "Developer", "Customer Support", "Admin")
- **Falls back to `source`** if no role_name (e.g., "llm", "ragas", "manual")
- **Defaults to "General"** if neither is available
- **No hardcoded categories** - adapts to your data structure

### Generic Gap Analysis
1. **Identifies poor performers** - any category with avg score < 6.0
2. **Detects critical issues** - questions with score < 3.0
3. **Generates recommendations** - based on performance, not domain
4. **Calculates priorities** - impact vs effort, domain-agnostic

## 📊 Example Use Cases

### 1. **Software Documentation**
```json
{
  "role_name": "Developer",
  "question": "How do I implement OAuth2?",
  "avg_quality_score": 4.2
}
```
→ Gap: "Category 'Developer' shows poor performance: 15 questions averaging 4.2/10"

### 2. **Customer Support**
```json
{
  "role_name": "Customer Support",
  "question": "How do I reset my password?",
  "avg_quality_score": 2.8
}
```
→ Gap: "Category 'Customer Support' shows poor performance: 8 questions averaging 2.8/10"

### 3. **Healthcare Documentation**
```json
{
  "role_name": "Nurse",
  "question": "What are the side effects of medication X?",
  "avg_quality_score": 6.5
}
```
→ Gap: "Category 'Nurse' shows weak performance: 12 questions averaging 6.5/10"

## 🚀 Benefits of Generic Design

### 1. **Universal Applicability**
- Works with any domain: healthcare, finance, tech, education, etc.
- No need to modify code for different datasets
- Same analysis quality regardless of content type

### 2. **Consistent Quality Metrics**
- Standardized 0-10 quality scale
- Universal thresholds for good/weak/poor performance
- Comparable results across different domains

### 3. **Flexible Categorization**
- Adapts to your existing role/category structure
- No predefined categories to constrain analysis
- Works with any organizational structure

### 4. **Scalable Recommendations**
- Generic improvement suggestions
- Domain-agnostic priority calculations
- Universal effort estimation

## 🔄 Migration from Domain-Specific

### What Was Changed
1. **Removed hardcoded topic patterns** (payment, forgiveness, etc.)
2. **Updated test data** to use generic examples
3. **Made logging messages** domain-agnostic
4. **Enhanced category detection** to be more flexible

### What Remains the Same
1. **Quality score calculations** - unchanged and universal
2. **Gap detection logic** - based on performance, not domain
3. **Recommendation structure** - same format, generic content
4. **Frontend display** - same UI, flexible labels

## 📋 Implementation Checklist

To use this system with your dataset:

- [ ] **Ensure experiment results** have `question` and quality/similarity scores
- [ ] **Add `role_name` field** if you want category-based analysis
- [ ] **Use `source` field** to distinguish question sources
- [ ] **No domain-specific configuration** needed
- [ ] **System automatically adapts** to your data structure

## 🎯 Expected Outcomes

With any dataset, you'll get:
- **Category-based gap analysis** (using your role/category structure)
- **Performance-based recommendations** (not domain-specific)
- **Universal quality metrics** (comparable across domains)
- **Scalable improvement suggestions** (applicable to any content)

The system is now truly **plug-and-play** for any RAG evaluation scenario.
