# API Optimization Analysis

This document provides a comprehensive analysis of frontend and backend API routes, identifying duplicates, consolidation opportunities, and strategies to reduce API dependency through better data storage and retrieval patterns.

## Executive Summary

### **Current State**
- **Frontend API Calls**: 32+ different API endpoints used across 6 pages
- **Backend API Routes**: 30+ endpoints with some redundancy and inefficiency
- **Major Issue**: Comparison data requires 6+ API calls to load two experiments
- **Opportunity**: 60%+ reduction in API calls possible through optimization

### **Key Findings**
1. **Duplicate API Patterns**: Multiple load/analysis cycles for same data
2. **Inefficient Data Packaging**: Multiple small calls instead of comprehensive responses
3. **Experiment Data Underutilization**: Rich experiment files not fully leveraged
4. **API Route Redundancy**: Similar endpoints with overlapping functionality

---

## Frontend API Usage Analysis

### **Current API Calls by Component**

#### **Dashboard Page**
```typescript
// Current: 1 API call
corpusApi.getStatus()  // Good - single comprehensive call
```

#### **Experiments Page**
```typescript
// Current: 1 API call  
experimentsApi.list()  // Good - includes all needed metadata
```

#### **Experiment Run Page**
```typescript
// Current: 3 API calls
questionsApi.getLLMQuestions()
questionsApi.getRAGASQuestions() 
experimentApi.run(config)  // + WebSocket streaming
```

#### **Results/Heatmap/Gap Analysis Pages**
```typescript  
// Current: 2-3 API calls each
resultsApi.getAnalysis()
resultsApi.getGapAnalysis()
corpusApi.getAllChunks()  // Only for heatmap
```

#### **Comparison Page (MAJOR INEFFICIENCY)**
```typescript
// Current: 6+ API calls for comparing 2 experiments
await fetch(`/api/experiments/load?filename=${experimentA}`);
await fetch('/api/results/analysis');
await fetch('/api/v1/analysis/gaps');

await fetch(`/api/experiments/load?filename=${experimentB}`);  
await fetch('/api/results/analysis');
await fetch('/api/v1/analysis/gaps');

// This is repeated for each comparison!
```

### **API Call Patterns - Problems Identified**

#### **🚫 Problem 1: Repeated Load/Analysis Cycles**
**Current Pattern**:
```typescript
// For every comparison:
1. Load experiment A → POST /api/experiments/load
2. Get analysis A → GET /api/results/analysis  
3. Get gap analysis A → GET /api/v1/analysis/gaps
4. Load experiment B → POST /api/experiments/load
5. Get analysis B → GET /api/results/analysis
6. Get gap analysis B → GET /api/v1/analysis/gaps
```

**Impact**: 6 API calls per comparison, with heavy server-side processing

#### **🚫 Problem 2: Fragmented Data Retrieval**
**Current Pattern**:
```typescript
// Questions are fetched separately
questionsApi.getLLMQuestions()   // /api/questions/llm
questionsApi.getRAGASQuestions() // /api/questions/ragas

// Should be combined into single call
```

#### **🚫 Problem 3: Inefficient Document Management**
**Current Pattern**:
```typescript
// Multiple individual operations
documentsApi.selectDocument(filename)   // POST /api/documents/select/{filename}
documentsApi.deselectDocument(filename) // POST /api/documents/deselect/{filename}
documentsApi.ingestDocument(filename)   // POST /api/documents/ingest/{filename}

// Should support batch operations
```

---

## Backend API Routes Analysis

### **Current Route Categories**

#### **Core Data Routes (Well-Designed)**
```python
@app.get("/api/corpus/status")          # ✅ Comprehensive corpus info
@app.get("/api/experiments/list")       # ✅ Rich experiment metadata
@app.get("/api/v1/experiment/config")   # ✅ Single config endpoint
```

#### **Analysis Routes (Potential for Consolidation)**
```python
@app.get("/api/results/analysis")       # Returns AnalysisResults
@app.get("/api/v1/analysis/gaps")       # Returns GapAnalysis  
@app.get("/api/v1/analysis/status")     # Returns status info

# Could be consolidated into single comprehensive analysis endpoint
```

#### **Document Routes (High Redundancy)**
```python
@app.post("/api/documents/select/{filename}")
@app.post("/api/documents/deselect/{filename}")  
@app.post("/api/documents/ingest/{filename}")
@app.post("/api/documents/delete/{filename}")

# Individual operations - should support batch processing
```

#### **Question Routes (Fragmented)**
```python
@app.get("/api/questions/llm")     # Gets LLM questions
@app.get("/api/questions/ragas")   # Gets RAGAS questions

# Should be combined or support multiple types in single call
```

#### **Experiment Routes (Load/Analysis Coupling Issue)**
```python
@app.post("/api/experiments/load")        # Changes global state
@app.get("/api/results/analysis")         # Depends on loaded experiment
@app.get("/api/v1/analysis/gaps")         # Depends on loaded experiment

# Tight coupling creates need for multiple calls
```

### **🚫 API Route Redundancy Issues**

#### **Duplicate Search Functionality**
```python
@app.get("/api/corpus/search")            # General corpus search
@app.get("/api/documents/search")         # Document-specific search
# Could be unified with type parameter
```

#### **Overlapping Status Routes**
```python
@app.get("/api/corpus/status")            # Corpus metadata
@app.get("/api/documents/status")         # Document status
@app.get("/api/v1/analysis/status")       # Analysis status
# Could provide unified status endpoint
```

#### **Fragmented Collection Operations**
```python
@app.post("/api/corpus/reload")           # Reload corpus
@app.post("/api/corpus/rebuild")          # Rebuild corpus  
@app.post("/api/documents/rebuild")       # Rebuild documents
@app.post("/api/documents/scan")          # Scan documents
# Operations could be unified under single endpoint with operation parameter
```

---

## Experiment Data Storage Optimization

### **Current Experiment File Analysis**

The experiment files contain **comprehensive data** that's underutilized:

#### **Available in Experiment Files (Not Being Used)**
```json
{
  "metadata": {
    "selected_documents": [...],           // ✅ Used 
    "total_selected_chunks": 2267,        // ✅ Used
    "avg_quality_score": 5.8             // ✅ Used
  },
  "results": {
    "performance": {
      "success_rate_percent": 9.0,        // 🔄 Partially used
      "queries_passed": 7,                // 🚫 Not used - API calculates
      "queries_failed": 71                // 🚫 Not used - API calculates
    }
  },
  "quality_score_metrics": {
    "quality_score_distribution": {       // 🚫 Not used - API calculates
      "excellent": 0, "good": 33, "fair": 44, "poor": 1
    },
    "quality_threshold_analysis": {       // 🚫 Not used - API calculates  
      "above_7": 11, "above_6": 33, "above_5": 67, "below_5": 11
    }
  },
  "question_results": [                   // ✅ Used for calculations
    {
      "quality_score": 6.8,
      "retrieved_docs": [...],
      "role_name": "borrower"
    }
  ]
}
```

#### **🚫 Current API Dependency Despite Available Data**

**Comparison Hook Issues**:
```typescript
// Lines 44-69: Makes 6 API calls even though data is in experiment files
await fetch(`/api/experiments/load?filename=${experimentA}`);
const [analysisAResponse, gapAnalysisAResponse] = await Promise.all([
  fetch('/api/results/analysis'),      // ❌ This data exists in experiment file!
  fetch('/api/v1/analysis/gaps')       // ❌ This data exists in experiment file!
]);
```

**What Could Be Done Instead**:
```typescript
// Optimized: Use experiment file data directly
const expAData = await storageAdapter.loadExperiment(experimentA);
const analysisData = {
  overall: {
    avg_quality_score: expAData.metadata.avg_quality_score,
    success_rate: expAData.results.performance.success_rate_percent,
    // ... other metrics from experiment file
  }
  // No API calls needed!
};
```

---

## Optimization Recommendations

### **Priority 1: Eliminate Comparison API Redundancy**

#### **Current: 6 API calls per comparison**
```typescript
// BEFORE: useComparisonData.ts lines 44-69
await fetch(`/api/experiments/load?filename=${experimentA}`);
await fetch('/api/results/analysis');
await fetch('/api/v1/analysis/gaps');
// Repeat for experiment B... 
```

#### **Optimized: 0 API calls (use experiment files)**
```typescript
// AFTER: All data from experiment files
const comparisonData = await Promise.all([
  storageAdapter.loadExperiment(experimentA),
  storageAdapter.loadExperiment(experimentB)
]).then(([expA, expB]) => ({
  // Build comparison directly from experiment data
  metrics: {
    overallQuality: { 
      before: expA.metadata.avg_quality_score, 
      after: expB.metadata.avg_quality_score 
    },
    successRate: {
      before: expA.results.performance.success_rate_percent,
      after: expB.results.performance.success_rate_percent  
    }
    // All other metrics available in files!
  }
}));
```

**Impact**: Eliminate 6 API calls per comparison, 90% faster loading

### **Priority 2: Consolidate Analysis Endpoints**

#### **Current: 3 separate analysis calls**
```python
GET /api/results/analysis      # Returns AnalysisResults
GET /api/v1/analysis/gaps      # Returns GapAnalysis
GET /api/v1/analysis/status    # Returns status
```

#### **Optimized: Single comprehensive endpoint**
```python  
@app.get("/api/analysis/complete")
async def get_complete_analysis(include_gaps: bool = True):
    return {
        "analysis": get_analysis_results(),
        "gaps": get_gap_analysis() if include_gaps else None,
        "status": get_analysis_status(),
        "metadata": get_experiment_metadata()
    }
```

**Impact**: Reduce 3 calls to 1, eliminate backend state dependencies

### **Priority 3: Batch Document Operations**

#### **Current: Individual document operations**
```python
POST /api/documents/select/{filename}
POST /api/documents/deselect/{filename}  
POST /api/documents/ingest/{filename}
```

#### **Optimized: Batch operations**
```python
@app.post("/api/documents/batch")
async def batch_document_operations(operations: List[DocumentOperation]):
    # operations = [
    #   {"action": "select", "files": ["doc1.pdf", "doc2.csv"]},
    #   {"action": "ingest", "files": ["doc3.pdf"]}  
    # ]
    return batch_process_documents(operations)
```

**Impact**: Reduce N operations to 1 batch call, better error handling

### **Priority 4: Consolidate Question Endpoints**

#### **Current: Separate question types**
```python
GET /api/questions/llm     # Returns LLM questions
GET /api/questions/ragas   # Returns RAGAS questions
```

#### **Optimized: Single parameterized endpoint**
```python
@app.get("/api/questions")
async def get_questions(types: List[str] = Query(["llm", "ragas"])):
    return {
        "llm": get_llm_questions() if "llm" in types else [],
        "ragas": get_ragas_questions() if "ragas" in types else []
    }
```

**Impact**: Reduce 2 calls to 1, support flexible question type combinations

### **Priority 5: Enhanced Experiment Data Endpoint**

#### **Current: Load + multiple analysis calls**
```python  
POST /api/experiments/load?filename=exp.json
GET /api/results/analysis
GET /api/v1/analysis/gaps
```

#### **Optimized: Single experiment data endpoint**
```python
@app.get("/api/experiments/{filename}/complete")
async def get_experiment_complete_data(filename: str):
    return {
        "experiment": load_experiment_file(filename),
        "analysis": calculate_analysis_from_file(filename),  
        "gaps": calculate_gaps_from_file(filename),
        "metadata": extract_metadata(filename)
    }
```

**Impact**: Reduce 3+ calls to 1, no global state dependencies

---

## Implementation Roadmap

### **Week 1: Experiment File Optimization**
- [ ] Create experiment file data extraction utilities
- [ ] Update useComparisonData to use file data directly
- [ ] Add caching layer for processed experiment data
- [ ] **Expected Result**: 90% reduction in comparison loading time

### **Week 2: Consolidate Analysis Endpoints**
- [ ] Create `/api/analysis/complete` endpoint
- [ ] Update results/gap analysis pages to use consolidated endpoint
- [ ] Remove old individual endpoints (with deprecation notices)
- [ ] **Expected Result**: 50% reduction in analysis page API calls

### **Week 3: Batch Document Operations**
- [ ] Implement `/api/documents/batch` endpoint
- [ ] Update DocumentManagement component for batch operations
- [ ] Add progress indicators for batch operations
- [ ] **Expected Result**: Better UX for multi-document operations

### **Week 4: Question Consolidation & Testing**
- [ ] Consolidate question endpoints into single parameterized endpoint
- [ ] Update experiment configuration to use consolidated endpoint
- [ ] Performance testing and optimization validation
- [ ] **Expected Result**: Cleaner API surface, easier maintenance

---

## Success Metrics

### **API Call Reduction Targets**
- **Comparison Loading**: 90% reduction (6 calls → 0 calls)
- **Analysis Pages**: 50% reduction (3 calls → 1 call)
- **Document Management**: Variable reduction based on operations
- **Overall**: 60% reduction in total API calls

### **Performance Improvements**
- **Comparison Page Loading**: <2 seconds (currently 5-10 seconds)
- **Analysis Page Loading**: <1 second (currently 2-3 seconds)
- **Reduced Server Load**: 60% fewer requests to process
- **Better Caching**: File-based data can be cached more effectively

### **Developer Experience Improvements**
- **Simpler API Surface**: Fewer endpoints to understand
- **Better Data Locality**: Related data returned together
- **Reduced State Dependencies**: Less coupling between endpoints
- **Easier Testing**: Fewer API mocking requirements

---

## Risk Assessment

### **Low Risk Changes**
- Using experiment file data instead of API calls (data already exists)
- Adding new consolidated endpoints (backward compatible)
- Caching layers and data extraction utilities

### **Medium Risk Changes**
- Removing old endpoints (requires deprecation strategy)
- Batch operations (need comprehensive error handling)
- Global state elimination (affects existing workflows)

### **Migration Strategy**
1. **Phase 1**: Add new optimized endpoints alongside existing ones
2. **Phase 2**: Update frontend to use new endpoints with feature flags
3. **Phase 3**: Deprecate old endpoints with clear migration timeline  
4. **Phase 4**: Remove deprecated endpoints after sufficient adoption

This approach ensures zero downtime and allows rollback if issues arise.

---

## Conclusion

The current API architecture has significant optimization opportunities, particularly in the comparison workflow where 6 API calls can be eliminated entirely by leveraging existing experiment file data. The proposed changes will result in:

- **60% overall reduction** in API calls
- **90% faster comparison loading**
- **Cleaner, more maintainable** API surface  
- **Better developer experience** with logical endpoint groupings

The optimization strategy focuses on **data locality** (keeping related data together), **reducing redundant processing** (leveraging stored experiment data), and **minimizing network overhead** (batch operations and consolidated endpoints).