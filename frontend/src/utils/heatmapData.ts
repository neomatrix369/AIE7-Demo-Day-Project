import { QuestionResult } from '../types';

export interface HeatmapPoint {
  id: string;
  x: number;
  y: number;
  size: number;
  color: number;
  opacity: number;
  data: QuestionHeatmapData | ChunkHeatmapData | RoleHeatmapData | ChunkToRoleHeatmapData;
}

export interface QuestionHeatmapData {
  type: 'question';
  questionId: string;
  questionText: string;
  source: string;
  qualityScore: number;
  status: 'good' | 'weak' | 'poor';
  retrievedChunks: Array<{
    chunkId: string;
    docId: string;
    similarity: number;
    title: string;
  }>;
  avgSimilarity: number;
  chunkFrequency: number; // How many chunks this question retrieves
}

export interface ChunkHeatmapData {
  type: 'chunk';
  chunkId: string;
  docId: string;
  title: string;
  retrievalFrequency: number; // How many questions retrieve this chunk
  avgSimilarity: number;
  bestQuestion: {
    questionId: string;
    questionText: string;
    similarity: number;
    roleName?: string;
  };
  retrievingQuestions: Array<{
    questionId: string;
    questionText: string;
    source: string;
    similarity: number;
    roleName?: string;
  }>;
  isUnretrieved?: boolean; // True if this chunk has never been retrieved by any question
}

export interface RoleHeatmapData {
  type: 'role';
  roleName: string;
  questionCount: number; // How many questions this role has
  avgQualityScore: number;
  totalChunksRetrieved: number; // Total unique chunks retrieved by all questions from this role
  topChunks: Array<{
    chunkId: string;
    docId: string;
    title: string;
    retrievalCount: number; // How many questions from this role retrieved this chunk
    avgSimilarity: number;
  }>;
  questions: Array<{
    questionId: string;
    questionText: string;
    source: string;
    qualityScore: number;
    chunksRetrieved: number;
  }>;
}

export interface ChunkToRoleHeatmapData {
  type: 'chunk-to-role';
  chunkId: string;
  docId: string;
  title: string;
  totalRetrievals: number; // Total times this chunk was retrieved across all roles
  roleAccess: Array<{
    roleName: string;
    accessCount: number; // How many questions from this role retrieved this chunk
    avgSimilarity: number;
    sampleQuestions: Array<{
      questionId: string;
      questionText: string;
      source: string;
      similarity: number;
    }>;
  }>;
  avgSimilarity: number; // Overall average similarity across all retrievals
  dominantRole: {
    roleName: string;
    accessCount: number;
    percentage: number; // Percentage of total retrievals from this role
  };
  isUnretrieved?: boolean; // True if this chunk has never been retrieved by any question
}

/**
 * Process questions data for Questions-to-Chunks perspective
 */
export function processQuestionsToChunks(questionResults: QuestionResult[]): HeatmapPoint[] {
  const maxChunkFrequency = Math.max(...questionResults.map(q => (q.retrieved_docs || []).length), 1);
  const maxQualityScore = Math.max(...questionResults.map(q => q.quality_score ?? 0), 1);
  
  return questionResults.map((question, index) => {
    const qualityScore = question.quality_score ?? 0;
    const retrievedDocs = question.retrieved_docs || [];
    
    const questionData: QuestionHeatmapData = {
      type: 'question',
      questionId: question.id || 'unknown',
      questionText: question.text || 'Unknown question',
      source: question.source || 'unknown',
      qualityScore: qualityScore,
      status: question.status || 'poor',
      retrievedChunks: retrievedDocs.map(doc => ({
        chunkId: doc.chunk_id || 'unknown',
        docId: doc.doc_id || 'unknown',
        similarity: (doc.similarity ?? 0) * 10, // Convert 0-1 to 0-10 scale
        title: doc.title || 'Unknown document'
      })),
      avgSimilarity: retrievedDocs.length > 0 
        ? (retrievedDocs.reduce((sum, doc) => sum + (doc.similarity ?? 0), 0) / retrievedDocs.length) * 10 // Convert to 0-10 scale
        : 0,
      chunkFrequency: retrievedDocs.length
    };

    return {
      id: question.id || `question_${index}`,
      x: index, // Question index on x-axis
      y: questionData.avgSimilarity * 10, // Average similarity (0-10 scale) on y-axis
      size: Math.max(0.3, (questionData.chunkFrequency / maxChunkFrequency) * 1.0), // Size based on chunk frequency
      color: qualityScore, // Pass actual quality score (0-10 scale)
      opacity: Math.max(0.6, qualityScore / 10), // Opacity based on quality score
      data: questionData
    };
  });
}

/**
 * Process questions data for Chunks-to-Questions perspective
 * Includes both retrieved chunks and Unretrieved chunks (never retrieved)
 */
export function processChunksToQuestions(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  // Build chunk frequency map
  const chunkMap = new Map<string, {
    chunkId: string;
    docId: string;
    title: string;
    questions: Array<{
      questionId: string;
      questionText: string;
      source: string;
      similarity: number;
      roleName?: string;
    }>;
    totalSimilarity: number;
  }>();

  questionResults.forEach(question => {
    const retrievedDocs = question.retrieved_docs || [];
    retrievedDocs.forEach(doc => {
      const chunkId = doc.chunk_id || 'unknown';
      
      if (!chunkMap.has(chunkId)) {
        chunkMap.set(chunkId, {
          chunkId,
          docId: doc.doc_id || 'unknown',
          title: doc.title || 'Unknown document',
          questions: [],
          totalSimilarity: 0
        });
      }

      const chunk = chunkMap.get(chunkId)!;
      chunk.questions.push({
        questionId: question.id || 'unknown',
        questionText: question.text || 'Unknown question',
        source: question.source || 'unknown',
        similarity: (doc.similarity ?? 0) * 10, // Convert 0-1 to 0-10 scale
        roleName: question.role_name || 'Unknown Role'
      });
      chunk.totalSimilarity += (doc.similarity ?? 0) * 10; // Convert to 0-10 scale
    });
  });

  const retrievedChunks = Array.from(chunkMap.values());
  
  // Add Unretrieved chunks if allChunks data is provided
  const UnretrievedChunks: Array<{
    chunkId: string;
    docId: string;
    title: string;
    questions: Array<any>;
    totalSimilarity: number;
    isUnretrieved: boolean;
  }> = [];
  
  if (allChunks) {
    const retrievedChunkIds = new Set(retrievedChunks.map(c => c.chunkId));
    
    allChunks.forEach(chunk => {
      if (!retrievedChunkIds.has(chunk.chunk_id)) {
        UnretrievedChunks.push({
          chunkId: chunk.chunk_id,
          docId: chunk.doc_id,
          title: chunk.title,
          questions: [],
          totalSimilarity: 0,
          isUnretrieved: true
        });
      }
    });
  }
  
  // Combine retrieved and Unretrieved chunks
  const allProcessedChunks = [
    ...retrievedChunks.map(c => ({ ...c, isUnretrieved: false })),
    ...UnretrievedChunks
  ];
  
  // Handle case where no chunks are found
  if (allProcessedChunks.length === 0) {
    return [];
  }

  const maxRetrievalFrequency = Math.max(...retrievedChunks.map(c => c.questions.length), 1);
  const maxAvgSimilarity = Math.max(...retrievedChunks.map(c => c.totalSimilarity / c.questions.length), 1);

  // Sort chunks: retrieved chunks first (by frequency), then Unretrieved chunks
  allProcessedChunks.sort((a, b) => {
    if (a.isUnretrieved && !b.isUnretrieved) return 1;
    if (!a.isUnretrieved && b.isUnretrieved) return -1;
    return b.questions.length - a.questions.length;
  });

  // Separate retrieved and Unretrieved chunks for different positioning strategies
  const retrievedChunkPoints: HeatmapPoint[] = [];
  const UnretrievedChunkPoints: HeatmapPoint[] = [];
  
  allProcessedChunks.forEach((chunk, index) => {
    if (chunk.isUnretrieved) {
      // Handle Unretrieved chunks with minimal data
      const chunkData: ChunkHeatmapData = {
        type: 'chunk',
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        title: chunk.title,
        retrievalFrequency: 0,
        avgSimilarity: 0,
        bestQuestion: {
          questionId: 'none',
          questionText: 'No questions retrieve this chunk',
          similarity: 0
        },
        retrievingQuestions: [],
        isUnretrieved: true
      };

      UnretrievedChunkPoints.push({
        id: chunk.chunkId,
        x: 0, // Will be calculated later
        y: 0, // Will be calculated later
        size: 0.15, // Much smaller size for Unretrieved chunks
        color: 0, // Grey color (will be handled in getHeatmapColor)
        opacity: 0.3, // Lower opacity for Unretrieved chunks
        data: chunkData
      });
    } else {
      // Handle retrieved chunks normally
      const avgSimilarity = chunk.totalSimilarity / chunk.questions.length;
      const bestQuestion = chunk.questions.reduce((best, current) => 
        current.similarity > best.similarity ? current : best
      );

      const chunkData: ChunkHeatmapData = {
        type: 'chunk',
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        title: chunk.title,
        retrievalFrequency: chunk.questions.length,
        avgSimilarity,
        bestQuestion: {
          questionId: bestQuestion.questionId,
          questionText: bestQuestion.questionText,
          similarity: bestQuestion.similarity,
          roleName: bestQuestion.roleName
        },
        retrievingQuestions: chunk.questions,
        isUnretrieved: false
      };

      retrievedChunkPoints.push({
        id: chunk.chunkId,
        x: 0, // Will be calculated later
        y: 0, // Will be calculated later
        size: Math.max(0.4, (chunkData.retrievalFrequency / maxRetrievalFrequency) * 1.0),
        color: avgSimilarity, // Pass actual average similarity (0-10 scale)
        opacity: Math.max(0.7, avgSimilarity / 10),
        data: chunkData
      });
    }
  });

  // Position retrieved chunks in the center area (natural cluster with more spread)
  const centerRadius = 30; // Increased radius for the center cluster
  retrievedChunkPoints.forEach((point, index) => {
    if (retrievedChunkPoints.length === 1) {
      // Single point in exact center
      point.x = 50;
      point.y = 50;
    } else {
      // Create organic scatter in center using deterministic pseudo-random positioning
      const seed = point.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const pseudoRandX = ((seed * 9301 + 49297) % 233280) / 233280 - 0.5; // -0.5 to 0.5
      const pseudoRandY = ((seed * 7927 + 12345) % 217728) / 217728 - 0.5; // Different sequence
      
      // Position in center with more generous spread
      const spreadRadius = Math.min(centerRadius, centerRadius * (index / retrievedChunkPoints.length + 0.5)); // Increased spread factor
      point.x = 50 + pseudoRandX * spreadRadius;
      point.y = 50 + pseudoRandY * spreadRadius;
    }
  });

  // Position Unretrieved chunks in scattered formation around the edges
  UnretrievedChunkPoints.forEach((point, index) => {
    if (UnretrievedChunkPoints.length === 0) return;
    
    // Create organic scatter around the edges using deterministic positioning
    const seed = point.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandX = ((seed * 12345 + 67890) % 233280) / 233280; // 0 to 1
    const pseudoRandY = ((seed * 54321 + 98765) % 217728) / 217728; // Different sequence
    const pseudoRandAngle = ((seed * 11111 + 22222) % 144000) / 144000 * 2 * Math.PI; // Random angle
    
    // Choose edge regions (corners and sides) with some randomness
    const edgeChoice = seed % 4;
    let x = 0, y = 0;
    
    switch (edgeChoice) {
      case 0: // Top edge area
        x = pseudoRandX * 80 + 10; // 10-90 range
        y = pseudoRandY * 20 + 5;  // 5-25 range (top area)
        break;
      case 1: // Right edge area  
        x = pseudoRandX * 20 + 75; // 75-95 range (right area)
        y = pseudoRandY * 80 + 10; // 10-90 range
        break;
      case 2: // Bottom edge area
        x = pseudoRandX * 80 + 10; // 10-90 range  
        y = pseudoRandY * 20 + 75; // 75-95 range (bottom area)
        break;
      case 3: // Left edge area
        x = pseudoRandX * 20 + 5;  // 5-25 range (left area)
        y = pseudoRandY * 80 + 10; // 10-90 range
        break;
    }
    
    // Add some additional randomness for more organic feel
    const jitterX = ((seed * 3333 + 4444) % 144000) / 144000 - 0.5; // -0.5 to 0.5
    const jitterY = ((seed * 5555 + 6666) % 144000) / 144000 - 0.5;
    
    point.x = Math.max(2, Math.min(98, x + jitterX * 8)); // Add jitter but keep in bounds
    point.y = Math.max(2, Math.min(98, y + jitterY * 8));
  });

  // Combine all points for collision detection
  const allPoints = [...retrievedChunkPoints, ...UnretrievedChunkPoints];
  
  // Apply collision detection and spacing optimization
  optimizePointSpacing(allPoints);
  
  return allPoints;
}

/**
 * Optimize point spacing to prevent overlaps using force-based collision detection
 */
function optimizePointSpacing(points: HeatmapPoint[]): void {
  if (points.length <= 1) return;
  
  const minDistance = 6.0; // Increased minimum distance between point centers (in coordinate units)
  const maxIterations = 80; // Increased iterations for better spacing
  const dampening = 0.7; // Reduces force over time for stability
  const repulsionStrength = 0.8; // Increased repulsion strength for better spacing
  
  // Calculate minimum distance based on point sizes
  const getMinDistance = (point1: HeatmapPoint, point2: HeatmapPoint): number => {
    // Convert normalized sizes to coordinate space (approximate)
    const radius1 = point1.size * 4.0; // Increased visual radius in coordinate space
    const radius2 = point2.size * 4.0;
    const basePadding = (radius1 + radius2) * 1.6; // Increased to 60% padding around circles
    
    // Ensure generous minimum spacing even for tiny Unretrieved chunks
    return Math.max(minDistance, basePadding, 4.0); // Increased minimum to 4.0 units
  };
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let totalMovement = 0;
    const forces: Array<{x: number, y: number}> = points.map(() => ({x: 0, y: 0}));
    
    // Calculate repulsion forces between all point pairs
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const point1 = points[i];
        const point2 = points[j];
        
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const requiredDistance = getMinDistance(point1, point2);
        
        if (distance < requiredDistance && distance > 0) {
          // Calculate repulsion force
          const overlap = requiredDistance - distance;
          const force = (overlap / requiredDistance) * repulsionStrength;
          
          // Normalize direction
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;
          
          // Apply forces (Newton's third law - equal and opposite)
          forces[i].x -= forceX;
          forces[i].y -= forceY;
          forces[j].x += forceX;
          forces[j].y += forceY;
        }
      }
    }
    
    // Apply forces with boundary constraints
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const force = forces[i];
      
      // Apply dampening
      const dampenedForceX = force.x * dampening;
      const dampenedForceY = force.y * dampening;
      
      // Calculate new position
      let newX = point.x + dampenedForceX;
      let newY = point.y + dampenedForceY;
      
      // Determine constraints based on chunk type
      const isUnretrieved = point.data.type === 'chunk' && point.data.isUnretrieved;
      
      if (isUnretrieved) {
        // Keep Unretrieved chunks near edges but within viewport with padding
        newX = Math.max(3, Math.min(97, newX));
        newY = Math.max(3, Math.min(97, newY));
        
        // If pushed too far from edges, gently guide back toward edge regions
        const centerDistance = Math.sqrt((newX - 50) ** 2 + (newY - 50) ** 2);
        if (centerDistance < 28) { // Reduced from 32 to give more space
          // Push gently toward nearest edge
          const angle = Math.atan2(newY - 50, newX - 50);
          const pushDistance = 0.5; // Increased push strength
          newX += Math.cos(angle) * pushDistance;
          newY += Math.sin(angle) * pushDistance;
        }
      } else {
        // Keep retrieved chunks in center area but allow more spread
        const maxCenterRadius = 35; // Increased from 32 to allow more spread
        const centerDistance = Math.sqrt((newX - 50) ** 2 + (newY - 50) ** 2);
        
        if (centerDistance > maxCenterRadius) {
          // Pull back toward center
          const angle = Math.atan2(newY - 50, newX - 50);
          newX = 50 + Math.cos(angle) * maxCenterRadius;
          newY = 50 + Math.sin(angle) * maxCenterRadius;
        }
        
        // Ensure within viewport with adequate padding
        newX = Math.max(8, Math.min(92, newX));
        newY = Math.max(8, Math.min(92, newY));
      }
      
      // Track total movement for convergence detection
      const movement = Math.abs(newX - point.x) + Math.abs(newY - point.y);
      totalMovement += movement;
      
      // Update point position
      point.x = newX;
      point.y = newY;
    }
    
    // Check for convergence (minimal movement) - stricter threshold for better spacing
    if (totalMovement < 0.05) {
      break;
    }
  }
}

/**
 * Get color based on quality score (0-10 scale) or intensity (0-1 scale)
 */
export function getHeatmapColor(value: number, isUnretrieved: boolean = false, isQualityScore: boolean = false): string {
  // Special color for Unretrieved chunks
  if (isUnretrieved || value === 0) return '#6c757d'; // Grey for Unretrieved chunks
  
  if (isQualityScore) {
    // Quality score scale (0-10): use actual thresholds
    if (value >= 7.0) return '#28a745'; // Green for good (≥7.0)
    if (value >= 5.0) return '#e67e22'; // Orange for weak (5.0-7.0)
    return '#dc3545'; // Red for poor (<5.0)
  } else {
    // Intensity scale (0-1): use proportional thresholds
    if (value >= 0.7) return '#28a745'; // Green for good
    if (value >= 0.5) return '#e67e22'; // Orange for weak
    return '#dc3545'; // Red for poor
  }
}

/**
 * Get size scaling for scatter points
 */
export function getScaledSize(normalizedSize: number, minSize: number = 8, maxSize: number = 24): number {
  return minSize + (normalizedSize * (maxSize - minSize));
}

/**
 * Calculate optimal positioning to reduce overlaps
 */
export function optimizePositions(points: HeatmapPoint[], width: number, height: number): HeatmapPoint[] {
  const margin = 20;
  const xScale = (width - 2 * margin) / Math.max(...points.map(p => p.x));
  const yScale = (height - 2 * margin) / Math.max(...points.map(p => p.y));

  return points.map(point => ({
    ...point,
    x: margin + (point.x * xScale),
    y: margin + (point.y * yScale)
  }));
}

/**
 * Filter points based on quality threshold
 */
export function filterPointsByQuality(
  points: HeatmapPoint[], 
  threshold: 'all' | 'good' | 'weak' | 'poor'
): HeatmapPoint[] {
  if (threshold === 'all') return points;
  
  return points.filter(point => {
    if (point.data.type === 'question') {
      return point.data.status === threshold;
    } else if (point.data.type === 'chunk') {
      // For chunks, determine status based on avgSimilarity
      const similarity = point.data.avgSimilarity;
      const status = similarity >= 7.0 ? 'good' : similarity >= 5.0 ? 'weak' : 'poor';
      return status === threshold;
    } else if (point.data.type === 'role') {
      // For roles, determine status based on avgQualityScore
      const score = point.data.avgQualityScore;
      const status = score >= 7.0 ? 'good' : score >= 5.0 ? 'weak' : 'poor';
      return status === threshold;
    } else {
      // For chunk-to-role, determine status based on avgSimilarity
      const similarity = point.data.avgSimilarity;
      const status = similarity >= 7.0 ? 'good' : similarity >= 5.0 ? 'weak' : 'poor';
      return status === threshold;
    }
  });
}

/**
 * Process questions data for Roles-to-Chunks perspective
 * Groups questions by their role and analyzes chunk retrieval patterns per role
 */
export function processRolesToChunks(questionResults: QuestionResult[]): HeatmapPoint[] {
  // Group questions by role
  const roleGroups = new Map<string, QuestionResult[]>();
  
  questionResults.forEach(question => {
    const roleName = question.role_name || 'Unknown Role';
    if (!roleGroups.has(roleName)) {
      roleGroups.set(roleName, []);
    }
    roleGroups.get(roleName)!.push(question);
  });

  const rolePoints: HeatmapPoint[] = [];
  const roleNames = Array.from(roleGroups.keys()).sort();
  
  roleNames.forEach((roleName, roleIndex) => {
    const questions = roleGroups.get(roleName)!;
    
    // Calculate role metrics
    const avgQualityScore = questions.reduce((sum, q) => sum + (q.quality_score || 0), 0) / questions.length;
    
    // Analyze chunks retrieved by this role
    const chunkAnalysis = new Map<string, {
      chunkId: string;
      docId: string;
      title: string;
      retrievalCount: number;
      totalSimilarity: number;
      questions: Array<{questionId: string; questionText: string; source: string; similarity: number}>;
    }>();
    
    questions.forEach(question => {
      (question.retrieved_docs || []).forEach(doc => {
        const chunkKey = doc.chunk_id || 'unknown';
        if (!chunkAnalysis.has(chunkKey)) {
          chunkAnalysis.set(chunkKey, {
            chunkId: doc.chunk_id || 'unknown',
            docId: doc.doc_id || 'unknown',
            title: doc.title || 'Unknown document',
            retrievalCount: 0,
            totalSimilarity: 0,
            questions: []
          });
        }
        
        const chunk = chunkAnalysis.get(chunkKey)!;
        chunk.retrievalCount++;
        chunk.totalSimilarity += (doc.similarity || 0);
        chunk.questions.push({
          questionId: question.id || 'unknown',
          questionText: question.text || 'Unknown question',
          source: question.source || 'unknown',
          similarity: (doc.similarity || 0) * 10 // Convert to 0-10 scale
        });
      });
    });
    
    // Prepare top chunks (sorted by retrieval frequency and similarity)
    const topChunks = Array.from(chunkAnalysis.values())
      .sort((a, b) => {
        const aScore = a.retrievalCount * (a.totalSimilarity / a.retrievalCount);
        const bScore = b.retrievalCount * (b.totalSimilarity / b.retrievalCount);
        return bScore - aScore;
      })
      .slice(0, 10) // Top 10 chunks
      .map(chunk => ({
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        title: chunk.title,
        retrievalCount: chunk.retrievalCount,
        avgSimilarity: (chunk.totalSimilarity / chunk.retrievalCount) * 10 // Convert to 0-10 scale
      }));

    const roleData: RoleHeatmapData = {
      type: 'role',
      roleName: roleName,
      questionCount: questions.length,
      avgQualityScore: avgQualityScore,
      totalChunksRetrieved: chunkAnalysis.size,
      topChunks: topChunks,
      questions: questions.map(q => ({
        questionId: q.id || 'unknown',
        questionText: q.text || 'Unknown question',
        source: q.source || 'unknown',
        qualityScore: q.quality_score || 0,
        chunksRetrieved: (q.retrieved_docs || []).length
      }))
    };

    rolePoints.push({
      id: `role_${roleName}`,
      x: roleIndex * 50, // Space roles horizontally
      y: avgQualityScore * 10, // Position based on average quality score
      size: Math.max(0.4, Math.min(1.2, questions.length / 10)), // Size based on question count
      color: avgQualityScore, // Color based on average quality score
      opacity: Math.max(0.7, avgQualityScore / 10), // Opacity based on quality score
      data: roleData
    });
  });

  // Apply spacing optimization to prevent overlaps
  optimizePointSpacing(rolePoints);
  
  return rolePoints;
}

/**
 * Process questions data for Chunks-to-Roles perspective
 * Shows how chunks are accessed by different user roles
 */
export function processChunksToRoles(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  // Build chunk access map grouped by chunk ID
  const chunkAccessMap = new Map<string, {
    chunkId: string;
    docId: string;
    title: string;
    roleAccess: Map<string, {
      accessCount: number;
      totalSimilarity: number;
      questions: Array<{questionId: string; questionText: string; source: string; similarity: number}>;
    }>;
    totalRetrievals: number;
    totalSimilarity: number;
  }>();

  // Process all questions to build chunk access patterns
  questionResults.forEach(question => {
    const roleName = question.role_name || 'Unknown Role';
    
    (question.retrieved_docs || []).forEach(doc => {
      const chunkKey = doc.chunk_id || 'unknown';
      
      if (!chunkAccessMap.has(chunkKey)) {
        chunkAccessMap.set(chunkKey, {
          chunkId: doc.chunk_id || 'unknown',
          docId: doc.doc_id || 'unknown',
          title: doc.title || 'Unknown document',
          roleAccess: new Map(),
          totalRetrievals: 0,
          totalSimilarity: 0
        });
      }
      
      const chunk = chunkAccessMap.get(chunkKey)!;
      
      if (!chunk.roleAccess.has(roleName)) {
        chunk.roleAccess.set(roleName, {
          accessCount: 0,
          totalSimilarity: 0,
          questions: []
        });
      }
      
      const roleData = chunk.roleAccess.get(roleName)!;
      roleData.accessCount++;
      roleData.totalSimilarity += (doc.similarity || 0);
      roleData.questions.push({
        questionId: question.id || 'unknown',
        questionText: question.text || 'Unknown question',
        source: question.source || 'unknown',
        similarity: (doc.similarity || 0) * 10 // Convert to 0-10 scale
      });
      
      chunk.totalRetrievals++;
      chunk.totalSimilarity += (doc.similarity || 0);
    });
  });

  // Add Unretrieved chunks if allChunks is provided
  const processedChunks = Array.from(chunkAccessMap.values());
  const UnretrievedChunks: typeof processedChunks = [];
  
  if (allChunks) {
    allChunks.forEach(chunk => {
      if (!chunkAccessMap.has(chunk.chunk_id)) {
        UnretrievedChunks.push({
          chunkId: chunk.chunk_id,
          docId: chunk.doc_id,
          title: chunk.title,
          roleAccess: new Map(),
          totalRetrievals: 0,
          totalSimilarity: 0
        });
      }
    });
  }

  const allProcessedChunks = [...processedChunks, ...UnretrievedChunks];
  const chunkPoints: HeatmapPoint[] = [];

  allProcessedChunks.forEach((chunk, index) => {
    if (chunk.totalRetrievals === 0) {
      // Handle Unretrieved chunks
      const chunkData: ChunkToRoleHeatmapData = {
        type: 'chunk-to-role',
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        title: chunk.title,
        totalRetrievals: 0,
        roleAccess: [],
        avgSimilarity: 0,
        dominantRole: {
          roleName: 'None',
          accessCount: 0,
          percentage: 0
        },
        isUnretrieved: true
      };

      chunkPoints.push({
        id: `chunk_${chunk.chunkId}`,
        x: 0, // Will be positioned later
        y: 0,
        size: 0.15, // Small size for Unretrieved chunks
        color: 0, // Grey color
        opacity: 0.3,
        data: chunkData
      });
    } else {
      // Handle chunks with role access
      const roleAccessArray = Array.from(chunk.roleAccess.entries()).map(([roleName, data]) => ({
        roleName,
        accessCount: data.accessCount,
        avgSimilarity: (data.totalSimilarity / data.accessCount) * 10, // Convert to 0-10 scale
        sampleQuestions: data.questions.slice(0, 3) // Top 3 questions
      }));

      // Find dominant role (role with most accesses)
      const dominantRoleEntry = roleAccessArray.reduce((max, current) => 
        current.accessCount > max.accessCount ? current : max
      );

      const avgSimilarity = (chunk.totalSimilarity / chunk.totalRetrievals) * 10; // Convert to 0-10 scale

      const chunkData: ChunkToRoleHeatmapData = {
        type: 'chunk-to-role',
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        title: chunk.title,
        totalRetrievals: chunk.totalRetrievals,
        roleAccess: roleAccessArray,
        avgSimilarity: avgSimilarity,
        dominantRole: {
          roleName: dominantRoleEntry.roleName,
          accessCount: dominantRoleEntry.accessCount,
          percentage: Math.round((dominantRoleEntry.accessCount / chunk.totalRetrievals) * 100)
        },
        isUnretrieved: false
      };

      chunkPoints.push({
        id: `chunk_${chunk.chunkId}`,
        x: 0, // Will be positioned later
        y: avgSimilarity * 10, // Position based on average similarity
        size: Math.max(0.3, Math.min(1.2, chunk.totalRetrievals / 5)), // Size based on total retrievals
        color: avgSimilarity, // Color based on average similarity
        opacity: Math.max(0.7, avgSimilarity / 10),
        data: chunkData
      });
    }
  });

  // Apply center-perimeter positioning similar to chunks-to-questions
  // Separate retrieved and Unretrieved chunks
  const retrievedChunkPoints = chunkPoints.filter(p => !p.data.isUnretrieved);
  const UnretrievedChunkPoints = chunkPoints.filter(p => p.data.isUnretrieved);

  // Position retrieved chunks in center
  const centerX = 50;
  const centerY = 50;
  const centerRadius = 20;

  retrievedChunkPoints.forEach((point, index) => {
    const angle = (index / retrievedChunkPoints.length) * 2 * Math.PI;
    const radius = Math.random() * centerRadius;
    point.x = centerX + radius * Math.cos(angle);
    point.y = centerY + radius * Math.sin(angle);
  });

  // Position Unretrieved chunks around perimeter
  UnretrievedChunkPoints.forEach((point, index) => {
    const angle = (index / UnretrievedChunkPoints.length) * 2 * Math.PI;
    const radius = 35 + Math.random() * 15; // Outer ring
    point.x = centerX + radius * Math.cos(angle);
    point.y = centerY + radius * Math.sin(angle);
  });

  const finalPoints = [...retrievedChunkPoints, ...UnretrievedChunkPoints];
  
  // Apply spacing optimization
  optimizePointSpacing(finalPoints);
  
  return finalPoints;
}