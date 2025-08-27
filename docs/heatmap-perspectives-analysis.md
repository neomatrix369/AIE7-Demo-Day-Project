# Heatmap Perspectives: Keep, Add, Remove Recommendations

Based on **Four Rules of Simple Design** and **MoSCow prioritization** from CLAUDE.md, here are the concrete actions for heatmap perspectives.

---

## Current Perspectives Analysis (Sorted by MoSCow Priority, then Impact Score)

| Perspective | Developer Value¹ | Client Value¹ | Visual Effectiveness¹ | Information Density¹ | Impact Score² | MoSCow³ | Reasoning |
|-------------|----------------|--------------|---------------------|-------------------|--------------|---------|-----------|
| **📋 Documents → Chunks** | 8/10 | 9/10 | 7/10 | 8/10 | **8.0** | **MUST** | **Reveals Intent**: Clear document-level clustering shows coverage gaps. **Business Critical**: Clients see which documents are underutilized vs overutilized. Hexagonal visualization intuitive for non-technical stakeholders. |
| **📄 Chunks → Questions** | 9/10 | 6/10 | 8/10 | 8/10 | **7.8** | **SHOULD** | **Tests Pass**: Good for debugging retrieval failures. **Developer-Focused**: Shows unretrieved chunks clearly. **Visual Good**: Center/edge distribution intuitive. Limited client business value but essential for technical optimization. |
| **🎭 Roles → Chunks** | 7/10 | 8/10 | 6/10 | 7/10 | **7.0** | **SHOULD** | **High Client Value**: Shows access patterns by user roles, critical for understanding user behavior. **Developer Insight**: Reveals role-based retrieval optimization opportunities. Moderate visual complexity but high actionable intelligence. |

## Additional Perspective Analysis (Sorted by MoSCow Priority, then Impact Score)

| **Potential Perspective** | Developer Value¹ | Client Value¹ | Visual Effectiveness¹ | Information Density¹ | Impact Score² | MoSCow³ | Reasoning |
|---------------------------|----------------|--------------|---------------------|-------------------|--------------|---------|-----------|
| **📊 Quality → Coverage** | 8/10 | 9/10 | 9/10 | 9/10 | **8.8** | **MUST** | **Maximum Impact**: Quality scores vs chunk coverage correlation. **Business Critical**: Shows ROI of content expansion. **Visual Power**: Heat gradient from poor coverage/quality to good. **Fewest Elements**: Simple 2D quality-coverage matrix. |
| **⏱️ Time → Performance** | 7/10 | 8/10 | 6/10 | 7/10 | **7.0** | **SHOULD** | **Experiment Evolution**: Shows performance trends over time. **Client Value**: ROI tracking and improvement validation. **Implementation**: Requires experiment history data. **Moderate Complexity**: Time series visualization. |
| **📋 Topic → Chunks** | 6/10 | 8/10 | 7/10 | 7/10 | **7.0** | **COULD** | **Subject Matter Focus**: Semantic clustering by content topics. **Client Value**: Content gap analysis by business domain. **Implementation Complexity**: Requires topic modeling/clustering. **Nice to Have**: Good insights but significant development effort. |
| **🎯 Questions → Chunks** | 6/10 | 7/10 | 7/10 | 6/10 | **6.5** | **COULD** | **Defined but unused**: Questions as source points mapping to chunks. **Moderate Value**: Shows query diversity but redundant with current chunk perspective. **Low Priority**: Similar insights available elsewhere. |
| **🔗 Documents → Questions** | 5/10 | 6/10 | 5/10 | 5/10 | **5.3** | **WON'T** | **Low Impact**: Direct document-question mapping lacks actionable insight. **Visual Clutter**: Too many connections reduce clarity. **Redundant**: Information available in other perspectives with better clarity. |

## Key Insights & Recommendations

### **MUST HAVE (Keep/Add)** ✅ (Sorted by Impact Score)
1. **Quality → Coverage** (New) - **Score: 8.8** - Highest impact potential, combines two key metrics
2. **Documents → Chunks** (Current) - **Score: 8.0** - Business critical, intuitive for stakeholders

### **SHOULD HAVE (Keep)** ⚠️ (Sorted by Impact Score)
1. **Chunks → Questions** (Current) - **Score: 7.8** - Essential for debugging and technical optimization
2. **Roles → Chunks** (Current) - **Score: 7.0** - High client value for user behavior analysis

### **COULD HAVE (Consider)** 💡 (Sorted by Impact Score)
1. **Time → Performance** - **Score: 7.0** - Good ROI tracking if experiment history available
2. **Topic → Chunks** - **Score: 7.0** - Content strategy insights but complex implementation

### **WON'T HAVE (Remove/Skip)** ❌
1. **Questions → Chunks** - **Redundant** with existing perspectives
2. **Documents → Questions** - **Low actionable value**, visual clutter

# 🎯 ACTIONS REQUIRED

## ➕ ADD (High Impact Addition)
1. **📊 Quality → Coverage** - **Score: 8.8** - Highest ROI perspective combining quality scores with chunk coverage

## ✅ KEEP (Current Working Perspectives - Sorted by Impact Score)
1. **📋 Documents → Chunks** - **Score: 8.0** - Business critical, client-focused
2. **📄 Chunks → Questions** - **Score: 7.8** - Essential for developer debugging
3. **🎭 Roles → Chunks** - **Score: 7.0** - High client value for user behavior

## ➖ REMOVE (Clean Up Code)
1. **🎯 Questions → Chunks** - Remove from `HeatmapPerspective` type (unused, redundant)

## 🚀 IMPLEMENTATION

### Immediate Actions:
```typescript
// Update types/index.ts
export type HeatmapPerspective = 
  | 'documents-to-chunks' 
  | 'chunks-to-questions' 
  | 'roles-to-chunks'
  | 'quality-to-coverage';  // ADD THIS
  // REMOVE: 'questions-to-chunks'
```

### Result: **3 Active + 1 Future** Perspectives (Priority Order by Score)

**🎯 IMPLEMENTED (Last 30 Minutes):**
1. **📋 Documents → Chunks** - **8.0** (KEEP - Business Critical) ✅ 
2. **📄 Chunks → Questions** - **7.8** (KEEP - Developer Essential) ✅
3. **🎭 Roles → Chunks** - **7.0** (KEEP - Client Value) ✅

**🚀 PLANNED FOR FUTURE:**
4. **📊 Quality → Coverage** - **8.8** (ADD - Maximum Impact) 🔮

**Implementation Status:**
- **✅ Removed**: `questions-to-chunks` from codebase (cleaned up)
- **✅ Sorted**: Control buttons by priority score (implemented)
- **✅ Standardized**: Quality terminology across all systems
- **🔮 Future**: Quality → Coverage perspective when backend analytics ready

## 📊 SCORING LEGEND

### Evaluation Criteria (0-10 Scale)
| Criteria | **<5.0 (Poor)** | **5.0-6.9 (Developing)** | **≥7.0 (Good)** |
|----------|-----------------|--------------------------|------------------|
| **Developer Value** | Minimal debugging utility | Some technical insights | Clear optimization paths & critical tools |
| **Client Value** | Low business relevance | Moderate ROI visibility | Strong business intelligence & decision support |
| **Visual Effectiveness** | Confusing/cluttered | Functional but unclear | Intuitive, clear & outstanding design |
| **Information Density** | Sparse actionable data | Moderate insights | Rich, useful information with maximum insight |

### **Impact Score Calculation**
- **Formula**: Average of all 4 criteria scores
- **Quality Thresholds**: GOOD (≥7.0), DEVELOPING (≥5.0), POOR (<5.0)
- **MoSCow Mapping**: 
  - **MUST**: ≥8.0 (Business Critical)
  - **SHOULD**: 7.0-7.9 (High Value) 
  - **COULD**: 6.0-6.9 (Nice to Have)
  - **WON'T**: <6.0 (Low Priority)

### Development Principles Applied
- **Four Rules of Simple Design**: Tests pass, Reveals intent, No duplication, Fewest elements
- **Pragmatic Approach**: Balance between less complexity and more impact
- **Evidence-Based**: Scores derived from actual codebase analysis and user value assessment

## Concepts Mapping

### Core Concepts in Heatmap System:
1. **Documents**: Source files (CSV, PDF, MD, TXT)
2. **Chunks**: Document segments (750 chars, 100 overlap)
3. **Questions**: Queries (LLM-generated, RAGAS-generated)
4. **Question Groups**: LLM vs RAGAS categorization
5. **Question Roles**: User personas/contexts within questions
6. **Quality Scores**: 0-10 scale (GOOD ≥7.0, DEVELOPING ≥5.0, POOR <5.0)
7. **Coverage**: Chunk retrieval frequency and distribution
8. **Similarity**: Vector similarity scores between queries and chunks

### Relationship Density:
- **High**: Documents ↔ Chunks (1:many, foundational)
- **High**: Questions ↔ Chunks (many:many, core retrieval)  
- **Medium**: Roles ↔ Questions (1:many, contextual)
- **Medium**: Quality ↔ Coverage (correlation, actionable)
- **Low**: Groups ↔ Roles (orthogonal categorization)

---

## 📝 SCORING FOOTNOTES

**¹ Evaluation Criteria (0-10 Scale):**
- **<5.0 (Poor)**: Minimal utility/value
- **5.0-6.9 (Developing)**: Moderate utility/value  
- **≥7.0 (Good)**: Strong utility/value to critical/essential utility/value

**² Impact Score:** Average of all 4 criteria scores

**³ MoSCow Priority Mapping:**
- **MUST**: ≥8.0 (Business Critical)
- **SHOULD**: 7.0-7.9 (High Value)
- **COULD**: 6.0-6.9 (Nice to Have)
- **WON'T**: <6.0 (Low Priority)