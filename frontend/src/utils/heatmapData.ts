import { QuestionResult } from '../types';

export interface HeatmapPoint {
  id: string;
  x: number;
  y: number;
  size: number;
  color: number;
  opacity: number;
  screenX?: number;
  screenY?: number;
  data: QuestionHeatmapData | ChunkHeatmapData | RoleHeatmapData | ChunkToRoleHeatmapData | UnassociatedClusterHeatmapData | DocumentHeatmapData;
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
    content: string;
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
  content: string;
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
  roleId: string;
  roleName: string;
  chunkCount: number; // Number of chunks accessible to this role
  chunks: Array<{
    chunkId: string;
    content: string;
    docId: string;
    title: string;
    retrievalFrequency: number; // How many questions from this role retrieved this chunk
    avgSimilarity: number;
    isUnretrieved: boolean;
    bestRetrievingQuestion?: {
      questionId: string;
      questionText: string;
      similarity: number;
      source: string;
    };
  }>;
  totalRetrievals: number; // Total times any chunk was retrieved by this role
  avgSimilarity: number; // Average similarity across all chunks for this role
  unassociatedChunkCount: number; // Number of chunks that were never retrieved by this role
  topRetrievingQuestions: Array<{
    questionId: string;
    questionText: string;
    source: string;
    chunksRetrieved: number;
    avgSimilarity: number;
  }>;
}

export interface ChunkToRoleHeatmapData {
  type: 'chunk-to-role';
  chunkId: string;
  docId: string;
  title: string;
  content: string;
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

export interface UnassociatedClusterHeatmapData {
  type: 'unassociated-cluster';
  clusterId: string;
  chunkCount: number; // Number of chunks in this cluster
  chunks: Array<{
    chunkId: string;
    docId: string;
    title: string;
  }>;
  documentBreakdown: Array<{
    docId: string;
    title: string;
    chunkCount: number;
  }>;
  centerPosition: { x: number; y: number }; // Cluster center coordinates
}

export interface DocumentHeatmapData {
  type: 'document';
  docId: string;
  title: string;
  chunkCount: number; // Number of chunks in this document
  chunks: Array<{
    chunkId: string;
    content: string;
    retrievalFrequency: number; // How many questions retrieved this chunk
    avgSimilarity: number;
    isUnretrieved: boolean;
    bestRetrievingQuestion?: {
      questionId: string;
      questionText: string;
      similarity: number;
      roleName?: string;
    };
  }>;
  totalRetrievals: number; // Total times any chunk from this document was retrieved
  avgSimilarity: number; // Average similarity across all chunks in this document
  unassociatedChunkCount: number; // Number of chunks that were never retrieved
  topRetrievingQuestions: Array<{
    questionId: string;
    questionText: string;
    source: string;
    roleName?: string;
    chunksRetrieved: number;
    avgSimilarity: number;
  }>;
}

/**
 * Position associated chunks in the inner area with consistent grid-based spacing
 */
export function positionAssociatedChunks(retrievedChunkPoints: HeatmapPoint[]): void {
  if (retrievedChunkPoints.length === 0) return;

  // Sort associated chunks by frequency for better central placement (highest frequency most central)
  retrievedChunkPoints.sort((a, b) => {
    const freqA = a.data.type === 'chunk' ? a.data.retrievalFrequency : 
                  a.data.type === 'chunk-to-role' ? a.data.totalRetrievals : 0;
    const freqB = b.data.type === 'chunk' ? b.data.retrievalFrequency : 
                  b.data.type === 'chunk-to-role' ? b.data.totalRetrievals : 0;
    return freqB - freqA;
  });
  
  // Calculate grid for associated chunks with 2x wider spacing than original
  const associatedAspectRatio = 1.1;
  const associatedCols = Math.ceil(Math.sqrt(retrievedChunkPoints.length * associatedAspectRatio));
  const associatedRows = Math.ceil(retrievedChunkPoints.length / associatedCols);
  
  // Use 2x wider spacing for associated chunks, focusing on inner area
  const innerAreaSize = 60; // Use 60% of container for inner area
  const associatedXSpacing = innerAreaSize / (associatedCols - 1 || 1);
  const associatedYSpacing = innerAreaSize / (associatedRows - 1 || 1);
  
  // Generate inner grid positions for associated chunks
  const associatedPositions: Array<{x: number, y: number, distanceFromCenter: number}> = [];
  
  for (let row = 0; row < associatedRows; row++) {
    for (let col = 0; col < associatedCols; col++) {
      if (associatedPositions.length >= retrievedChunkPoints.length) break;
      
      // Center the inner grid within the container
      const innerStartX = 20; // Start inner area at 20% from edge
      const innerStartY = 20;
      const x = innerStartX + (col * associatedXSpacing);
      const y = innerStartY + (row * associatedYSpacing);
      
      const centerX = 50;
      const centerY = 50;
      const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      
      associatedPositions.push({ x, y, distanceFromCenter });
    }
  }
  
  // Sort associated positions from inside-out (center first for high-frequency chunks)
  associatedPositions.sort((a, b) => a.distanceFromCenter - b.distanceFromCenter);
  
  // Assign inner positions to associated chunks
  retrievedChunkPoints.forEach((point, index) => {
    if (index < associatedPositions.length) {
      const pos = associatedPositions[index];
      point.x = pos.x;
      point.y = pos.y;
    }
  });
}

/**
 * Group unassociated chunks into spatial clusters for cleaner visualization
 */
function groupUnassociatedChunks(
  unassociatedChunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}>,
  targetClusterCount: number = 12,
  maxAssociatedChunkFrequency: number = 1,
  totalAssociatedChunks: number = 1,
  minAssociatedChunkSize: number = 0.6
): HeatmapPoint[] {
  console.log('🔍 groupUnassociatedChunks called:', {
    unassociatedCount: unassociatedChunks.length,
    targetClusters: targetClusterCount,
    totalAssociated: totalAssociatedChunks
  });
  
  if (unassociatedChunks.length === 0) {
    console.log('⚠️ No unassociated chunks found, returning empty array');
    return [];
  }

  // Create grid-based clusters around the perimeter
  const clusters: Array<{
    id: string;
    chunks: typeof unassociatedChunks;
    position: { x: number; y: number };
  }> = [];

  // Define cluster positions at the very edges to completely avoid overlap with document clusters
  const clusterPositions = [
    // Top edge - at the very top
    { x: 5, y: 1 }, { x: 20, y: 0.5 }, { x: 40, y: 0.2 }, { x: 60, y: 0.5 }, { x: 80, y: 1 }, { x: 95, y: 1.5 },
    // Right edge - at the very right
    { x: 98, y: 10 }, { x: 99, y: 30 }, { x: 98, y: 50 }, { x: 99, y: 70 }, { x: 98, y: 90 },
    // Bottom edge - at the very bottom
    { x: 95, y: 98.5 }, { x: 80, y: 99 }, { x: 60, y: 99.5 }, { x: 40, y: 99 }, { x: 20, y: 98.5 }, { x: 5, y: 98 },
    // Left edge - at the very left
    { x: 1.5, y: 90 }, { x: 0.5, y: 70 }, { x: 1.5, y: 50 }, { x: 0.5, y: 30 }, { x: 1.5, y: 10 }
  ];

  // Use only the number of clusters we need
  const actualClusterCount = Math.min(targetClusterCount, clusterPositions.length);
  const selectedPositions = clusterPositions.slice(0, actualClusterCount);

  // Initialize clusters
  selectedPositions.forEach((pos, index) => {
    clusters.push({
      id: `cluster_${index}`,
      chunks: [],
      position: pos
    });
  });

  // Distribute unassociated chunks among clusters (simple round-robin)
  unassociatedChunks.forEach((chunk, index) => {
    const clusterIndex = index % clusters.length;
    clusters[clusterIndex].chunks.push(chunk);
  });

  // Convert clusters to HeatmapPoints
  const heatmapPoints = clusters.map(cluster => {
    // Follow same size calculation as documents-to-chunks and roles-to-chunks
    const clusterChunkCount = cluster.chunks.length;
    const maxClusterSize = Math.max(...clusters.map(c => c.chunks.length), 1);
    
    // Same linear sizing as other heatmaps: range 3.0 to 8.0
    const chunkCountRatio = clusterChunkCount / maxClusterSize;
    const hexagonSize = 3.0 + (chunkCountRatio * 5.0);
    
    // Use darker brown color range (5.0-7.0) to trigger isUnretrieved=true in getHeatmapColor
    const clusterIntensity = chunkCountRatio; // Already normalized 0-1
    const darkBrownColor = 5.0 + (clusterIntensity * 2.0); // Range: 5.0 to 7.0 for darker browns
    
    // Group chunks by document for breakdown
    const documentBreakdown = new Map<string, { title: string; count: number }>();
    cluster.chunks.forEach(chunk => {
      const docKey = chunk.doc_id;
      if (!documentBreakdown.has(docKey)) {
        documentBreakdown.set(docKey, { title: chunk.title, count: 0 });
      }
      documentBreakdown.get(docKey)!.count++;
    });

    const clusterData: UnassociatedClusterHeatmapData = {
      type: 'unassociated-cluster',
      clusterId: cluster.id,
      chunkCount: cluster.chunks.length,
      chunks: cluster.chunks.map(chunk => ({
        chunkId: chunk.chunk_id,
        docId: chunk.doc_id,
        title: chunk.title
      })),
      documentBreakdown: Array.from(documentBreakdown.entries()).map(([docId, data]) => ({
        docId,
        title: data.title,
        chunkCount: data.count
      })),
      centerPosition: cluster.position
    };

    return {
      id: cluster.id,
      x: cluster.position.x,
      y: cluster.position.y,
      size: hexagonSize, // Use same linear sizing as documents-to-chunks: 3.0 to 8.0
      color: darkBrownColor, // Range: 5.0-7.0 to trigger brown colors in getHeatmapColor
      opacity: 0.6, // Same opacity as other heatmaps use for unretrieved chunks
      data: clusterData
    };
  });
  
  console.log('✅ Created unretrieved chunk clusters:', {
    pointCount: heatmapPoints.length,
    totalUnretrievedChunks: unassociatedChunks.length,
    points: heatmapPoints.map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      size: p.size,
      color: p.color,
      chunkCount: (p.data as UnassociatedClusterHeatmapData).chunkCount,
      type: p.data.type
    }))
  });
  
  return heatmapPoints;
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
        content: doc.content || '',
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
      size: Math.max(0.6, (questionData.chunkFrequency / maxChunkFrequency) * 1.0 * (0.8 + (qualityScore / 10) * 0.2)), // Size based on frequency and quality
      color: qualityScore, // Pass actual quality score (0-10 scale)
      opacity: 0.8, // Fixed visible opacity - use color and size for differentiation
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
    content: string;
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
        // Find content from allChunks if available
        const allChunk = allChunks?.find(chunk => chunk.chunk_id === chunkId);
        
        chunkMap.set(chunkId, {
          chunkId,
          docId: doc.doc_id || 'unknown',
          title: doc.title || 'Unknown document',
          content: doc.content || allChunk?.content || '',
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
  
  // Create clustered unassociated chunks if allChunks data is provided
  let unassociatedChunkPoints: HeatmapPoint[] = [];
  if (allChunks) {
    // Find chunks that were never retrieved
    const retrievedChunkIds = new Set(retrievedChunks.map(chunk => chunk.chunkId));
    const unassociatedChunks = allChunks.filter(chunk => !retrievedChunkIds.has(chunk.chunk_id));
    
    if (unassociatedChunks.length > 0) {
      console.log(`📊 Found ${unassociatedChunks.length} unretrieved chunks for chunks-to-questions view`);
      
      // Calculate clustering parameters based on retrieved chunks
      const maxRetrievalFrequency = Math.max(...retrievedChunks.map(c => c.questions.length), 1);
      const minRetrievedChunkSize = retrievedChunks.length > 0 ? 
        Math.min(...retrievedChunks.map(c => (c.questions.length / maxRetrievalFrequency) * 1.0)) : 0.6;
      
      // Use existing clustering function to group unretrieved chunks
      const targetClusterCount = Math.min(8, Math.max(3, Math.ceil(unassociatedChunks.length / 50))); // 3-8 clusters based on chunk count
      
      unassociatedChunkPoints = groupUnassociatedChunks(
        unassociatedChunks,
        targetClusterCount,
        maxRetrievalFrequency,
        retrievedChunks.length,
        minRetrievedChunkSize
      );
      
      console.log(`📊 Created ${unassociatedChunkPoints.length} unretrieved chunk clusters for ${unassociatedChunks.length} chunks`);
    }
  }
  
  // Handle case where no chunks are found
  if (retrievedChunks.length === 0 && unassociatedChunkPoints.length === 0) {
    return [];
  }

  const maxRetrievalFrequency = Math.max(...retrievedChunks.map(c => c.questions.length), 1);

  // Create retrieved chunk points
  const retrievedChunkPoints: HeatmapPoint[] = retrievedChunks.map((chunk) => {
    const avgSimilarity = chunk.totalSimilarity / chunk.questions.length;
    
    if (Math.random() < 0.05) { // Log 5% for debugging
      console.log('📊 Chunk similarity debug:', {
        chunkId: chunk.chunkId,
        totalSimilarity: chunk.totalSimilarity,
        questionCount: chunk.questions.length,
        avgSimilarity,
        sampleQuestions: chunk.questions.slice(0, 2).map(q => ({
          id: q.questionId,
          similarity: q.similarity
        }))
      });
    }
    const bestQuestion = chunk.questions.reduce((best, current) => 
      current.similarity > best.similarity ? current : best
    );

    const chunkData: ChunkHeatmapData = {
      type: 'chunk',
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      title: chunk.title,
      content: chunk.content,
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

    return {
      id: chunk.chunkId,
      x: 0, // Will be calculated later
      y: 0, // Will be calculated later
      size: Math.max(0.6, (chunkData.retrievalFrequency / maxRetrievalFrequency) * 1.0 * (0.8 + (avgSimilarity / 10) * 0.2)),
      color: avgSimilarity, // Pass actual average similarity (0-10 scale)
      opacity: 0.8, // Fixed visible opacity - use color and size for differentiation
      data: chunkData
    };
  });

  // Combine retrieved and unretrieved chunks
  const allChunkPoints = [...retrievedChunkPoints, ...unassociatedChunkPoints];
  
  // Position all chunks using simple grid layout
  positionAssociatedChunks(allChunkPoints);
  
  // Apply collision detection and spacing optimization
  optimizePointSpacing(allChunkPoints);
  
  return allChunkPoints;
}

/**
 * Optimize point spacing to prevent overlaps using size-aware collision detection with double gaps
 */
function optimizePointSpacing(points: HeatmapPoint[]): void {
  if (points.length <= 1) return;
  
  const minDistance = 7.0; // Doubled from 3.5 for wider hexagon gaps
  const maxIterations = 60; // Slightly increased for better spacing with larger gaps
  const dampening = 0.6; // Adjusted dampening for wider spacing stability
  const repulsionStrength = 0.5; // Slightly increased for better gap maintenance
  
  // Calculate minimum distance based on point sizes and neighbor awareness with double gaps
  const getMinDistance = (point1: HeatmapPoint, point2: HeatmapPoint): number => {
    // Convert normalized sizes to coordinate space with larger radius calculation
    const radius1 = point1.size * 4.0; // Increased from 3.0 for bigger hexagon representation
    const radius2 = point2.size * 4.0;
    const basePadding = (radius1 + radius2) * 2.0; // Doubled padding from 1.2 to 2.0 for wider gaps
    
    // Consider neighbor sizes for dynamic spacing with doubled minimum
    return Math.max(minDistance, basePadding, 5.0); // Doubled from 2.5 to 5.0
  };
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let totalMovement = 0;
    const forces: Array<{x: number, y: number}> = points.map(() => ({x: 0, y: 0}));
    
    // Calculate repulsion forces between nearby points only (optimization)
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const point1 = points[i];
        const point2 = points[j];
        
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only process nearby points for efficiency - increased threshold for wider gaps
        if (distance > 25) continue;
        
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
    
    // Apply forces with minimal constraints to maintain grid structure
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const force = forces[i];
      
      // Apply dampening
      const dampenedForceX = force.x * dampening;
      const dampenedForceY = force.y * dampening;
      
      // Calculate new position with reduced movement
      let newX = point.x + dampenedForceX;
      let newY = point.y + dampenedForceY;
      
      // Keep all points within viewport bounds with padding
      newX = Math.max(2, Math.min(98, newX));
      newY = Math.max(2, Math.min(98, newY));
      
      // Track total movement for convergence detection
      const movement = Math.abs(newX - point.x) + Math.abs(newY - point.y);
      totalMovement += movement;
      
      // Update point position
      point.x = newX;
      point.y = newY;
    }
    
    // Check for convergence with relaxed threshold for grid layout
    if (totalMovement < 0.1) {
      break;
    }
  }
}

/**
 * Get color based on quality score (0-10 scale) or intensity (0-1 scale)
 */
export function getHeatmapColor(value: number, isUnretrieved: boolean = false, isQualityScore: boolean = false): string {
  // For unassociated chunks, use darker brown colors for better visibility
  if (isUnretrieved) {
    // Unassociated chunks use values 5.0-7.0 for visibility
    // Use darker brown shades that are clearly visible
    const normalizedIntensity = Math.max(0, Math.min(1, (value - 5.0) / 2.0)); // Normalize 5.0-7.0 to 0-1
    
    // Use darker brown colors with good contrast
    if (normalizedIntensity >= 0.7) return '#5d4037'; // Dark brown for high intensity
    if (normalizedIntensity >= 0.4) return '#6d4c41'; // Medium-dark brown
    if (normalizedIntensity >= 0.2) return '#795548'; // Standard brown
    return '#8d6e63'; // Light brown but still visible
  }
  
  // Remove special handling for unretrieved clusters - use standard quality color scheme
  
  // Default zero value handling
  if (value === 0) return '#e0e0e0'; // Light grey for true zero values
  
  // Ensure all colors are visible and distinct - simplified approach
  if (isQualityScore) {
    // Quality score scale (0-10) - use bright, visible colors
    if (value >= 7.0) return '#2e7d32'; // Bright green for good (≥7.0)
    if (value >= 5.0) return '#ff8f00'; // Bright orange for weak (5.0-7.0) 
    return '#d32f2f'; // Bright red for poor (<5.0)
  } else {
    // Intensity scale (0-1) - use bright, visible colors
    if (value >= 0.7) return '#2e7d32'; // Bright green for good
    if (value >= 0.5) return '#ff8f00'; // Bright orange for weak
    return '#d32f2f'; // Bright red for poor
  }
}

/**
 * Get size scaling for scatter points
 */
export function getScaledSize(
  normalizedSize: number,
  minSize: number = 8,
  maxSize: number = 24
): number {
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
      // For roles, determine status based on avgSimilarity
      const score = point.data.avgSimilarity;
      const status = score >= 7.0 ? 'good' : score >= 5.0 ? 'weak' : 'poor';
      return status === threshold;
    } else if (point.data.type === 'chunk-to-role') {
      // For chunk-to-role, determine status based on avgSimilarity
      const similarity = point.data.avgSimilarity;
      const status = similarity >= 7.0 ? 'good' : similarity >= 5.0 ? 'weak' : 'poor';
      return status === threshold;
    } else {
      // For unassociated clusters, always show them (they represent background)
      return true;
    }
  });
}


/**
 * Process questions data for Roles-to-Chunks perspective
 * Each role hexagon contains multiple chunks accessed by that role, following Documents-to-Chunks pattern
 */
export function processRolesToChunks(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  // Build role map with chunk information (following Documents-to-Chunks pattern)
  const roleMap = new Map<string, {
    roleId: string;
    roleName: string;
    chunks: Map<string, {
      chunkId: string;
      content: string;
      docId: string;
      title: string;
      retrievalFrequency: number;
      totalSimilarity: number;
      questions: Array<{questionId: string; questionText: string; similarity: number; source: string}>;
    }>;
    totalRetrievals: number;
    totalSimilarity: number;
  }>();

  // Initialize roles from retrieved chunks
  questionResults.forEach(question => {
    const roleName = question.role_name || 'Unknown Role';
    (question.retrieved_docs || []).forEach(doc => {
      const roleKey = roleName;
      const chunkKey = doc.chunk_id || 'unknown';
      
      if (!roleMap.has(roleKey)) {
        roleMap.set(roleKey, {
          roleId: roleName.toLowerCase().replace(/\s+/g, '_'),
          roleName: roleName,
          chunks: new Map(),
          totalRetrievals: 0,
          totalSimilarity: 0
        });
      }
      
      const role = roleMap.get(roleKey)!;
      
      if (!role.chunks.has(chunkKey)) {
        role.chunks.set(chunkKey, {
          chunkId: doc.chunk_id || 'unknown',
          content: doc.content || '',
          docId: doc.doc_id || 'unknown',
          title: doc.title || 'Unknown document',
          retrievalFrequency: 0,
          totalSimilarity: 0,
          questions: []
        });
      }
      
      const chunk = role.chunks.get(chunkKey)!;
      chunk.retrievalFrequency++;
      chunk.totalSimilarity += (doc.similarity || 0) * 10; // Convert to 0-10 scale
      chunk.questions.push({
        questionId: question.id || 'unknown',
        questionText: question.text || 'Unknown question',
        similarity: (doc.similarity || 0) * 10, // Convert to 0-10 scale
        source: question.source || 'unknown'
      });
      
      role.totalRetrievals++;
      role.totalSimilarity += (doc.similarity || 0) * 10; // Convert to 0-10 scale
    });
  });

  // Add unassociated chunks to their respective roles based on document associations
  if (allChunks) {
    const retrievedChunkIds = new Set<string>();
    roleMap.forEach(role => {
      role.chunks.forEach((_, chunkId) => retrievedChunkIds.add(chunkId));
    });

    const unassociatedChunks = allChunks.filter(chunk => !retrievedChunkIds.has(chunk.chunk_id));
    
    // Group unassociated chunks by document and distribute them to roles that have chunks from the same document
    const documentToRoles = new Map<string, Set<string>>();
    roleMap.forEach(role => {
      role.chunks.forEach(chunk => {
        if (!documentToRoles.has(chunk.docId)) {
          documentToRoles.set(chunk.docId, new Set());
        }
        documentToRoles.get(chunk.docId)!.add(role.roleName);
      });
    });
    
    // First, add unassociated chunks to roles that have chunks from the same document
    const distributedChunks = new Set<string>();
    unassociatedChunks.forEach(chunk => {
      const docId = chunk.doc_id;
      const rolesForDoc = documentToRoles.get(docId);
      
      if (rolesForDoc && rolesForDoc.size > 0) {
        // Add to the first role that has chunks from this document
        const targetRoleName = Array.from(rolesForDoc)[0];
        const targetRole = roleMap.get(targetRoleName);
        
        if (targetRole) {
          targetRole.chunks.set(chunk.chunk_id, {
            chunkId: chunk.chunk_id,
            content: chunk.content,
            docId: chunk.doc_id,
            title: chunk.title,
            retrievalFrequency: 0,
            totalSimilarity: 0,
            questions: []
          });
          distributedChunks.add(chunk.chunk_id);
        }
      }
    });
    
    // Create a separate "Unassociated" role for remaining unassociated chunks
    const remainingUnassociatedChunks = unassociatedChunks.filter(chunk => !distributedChunks.has(chunk.chunk_id));
    
    if (remainingUnassociatedChunks.length > 0) {
      const unassociatedRoleName = 'Unassociated Chunks';
      roleMap.set(unassociatedRoleName, {
        roleId: 'unassociated_chunks',
        roleName: unassociatedRoleName,
        chunks: new Map(),
        totalRetrievals: 0,
        totalSimilarity: 0
      });
      
      const unassociatedRole = roleMap.get(unassociatedRoleName)!;
      remainingUnassociatedChunks.forEach(chunk => {
        unassociatedRole.chunks.set(chunk.chunk_id, {
          chunkId: chunk.chunk_id,
          content: chunk.content,
          docId: chunk.doc_id,
          title: chunk.title,
          retrievalFrequency: 0,
          totalSimilarity: 0,
          questions: []
        });
      });
    }
  }

  // Calculate maximums for normalization
  const maxChunkCount = Math.max(...Array.from(roleMap.values()).map(role => role.chunks.size), 1);

  // Convert to HeatmapPoint array
  const points: HeatmapPoint[] = Array.from(roleMap.entries()).map(([_, role]) => {
    // Process chunks for this role
    const chunks = Array.from(role.chunks.entries()).map(([_, chunk]) => {
      const avgSimilarity = chunk.retrievalFrequency > 0 ? chunk.totalSimilarity / chunk.retrievalFrequency : 0;
      const bestQuestion = chunk.questions.length > 0 
        ? chunk.questions.reduce((best, q) => q.similarity > best.similarity ? q : best, chunk.questions[0])
        : undefined;
        
      return {
        chunkId: chunk.chunkId,
        content: chunk.content,
        docId: chunk.docId,
        title: chunk.title,
        retrievalFrequency: chunk.retrievalFrequency,
        avgSimilarity: avgSimilarity,
        isUnretrieved: chunk.retrievalFrequency === 0,
        bestRetrievingQuestion: bestQuestion ? {
          questionId: bestQuestion.questionId,
          questionText: bestQuestion.questionText,
          similarity: bestQuestion.similarity,
          source: bestQuestion.source
        } : undefined
      };
    });

    // Find top retrieving questions for this role
    const questionRetrieval = new Map<string, {questionId: string; questionText: string; source: string; chunksRetrieved: number; totalSimilarity: number}>();
    
    role.chunks.forEach(chunk => {
      chunk.questions.forEach(q => {
        if (!questionRetrieval.has(q.questionId)) {
          questionRetrieval.set(q.questionId, {
            questionId: q.questionId,
            questionText: q.questionText,
            source: q.source,
            chunksRetrieved: 0,
            totalSimilarity: 0
          });
        }
        const qData = questionRetrieval.get(q.questionId)!;
        qData.chunksRetrieved++;
        qData.totalSimilarity += q.similarity;
      });
    });

    const topRetrievingQuestions = Array.from(questionRetrieval.values())
      .map(q => ({
        questionId: q.questionId,
        questionText: q.questionText,
        source: q.source,
        chunksRetrieved: q.chunksRetrieved,
        avgSimilarity: q.chunksRetrieved > 0 ? q.totalSimilarity / q.chunksRetrieved : 0
      }))
      .sort((a, b) => b.chunksRetrieved - a.chunksRetrieved || b.avgSimilarity - a.avgSimilarity)
      .slice(0, 5);

    const avgSimilarity = role.totalRetrievals > 0 ? role.totalSimilarity / role.totalRetrievals : 0;
    const unassociatedChunkCount = chunks.filter(c => c.isUnretrieved).length;
    
    const roleData: RoleHeatmapData = {
      type: 'role',
      roleId: role.roleId,
      roleName: role.roleName,
      chunkCount: chunks.length,
      chunks: chunks,
      totalRetrievals: role.totalRetrievals,
      avgSimilarity: avgSimilarity,
      unassociatedChunkCount: unassociatedChunkCount,
      topRetrievingQuestions: topRetrievingQuestions
    };

    // Size DIRECTLY proportional to chunk count
    const chunkCountRatio = chunks.length / maxChunkCount;
    const hexagonSize = 3.0 + (chunkCountRatio * 5.0);

    return {
      id: `role_${role.roleId}`,
      x: 0, // Will be positioned later
      y: 0, // Will be positioned later  
      size: hexagonSize,
      color: avgSimilarity, // Color based on average similarity
      opacity: role.totalRetrievals > 0 ? 0.8 : 0.6,
      data: roleData
    };
  });

  // Position roles with improved spacing and special handling for unassociated role
  const maxSize = Math.max(...points.map(p => p.size));
  
  // Separate unassociated role from regular roles
  const regularRoles = points.filter(p => p.data.type === 'role' && p.data.roleName !== 'Unassociated Chunks');
  const unassociatedRole = points.find(p => p.data.type === 'role' && p.data.roleName === 'Unassociated Chunks');
  
  // Position regular roles in a grid layout with better spacing
  const aspectRatio = 0.8;
  const cols = Math.min(Math.ceil(Math.sqrt(regularRoles.length * aspectRatio)), 3);
  const rows = Math.ceil(regularRoles.length / cols);
  
  const marginX = Math.max(20, maxSize * 3); // Increased margin
  const marginY = Math.max(20, maxSize * 3); // Increased margin
  
  const availableWidth = 100 - (marginX * 2);
  const availableHeight = 100 - (marginY * 2);
  
  // Add extra spacing between clusters
  const extraSpacing = 20; // Increased extra spacing
  const xSpacing = cols > 1 ? (availableWidth + extraSpacing) / (cols - 1) : 0;
  const ySpacing = rows > 1 ? (availableHeight + extraSpacing) / (rows - 1) : 0;
  
  regularRoles.forEach((point, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    // Center the grid in the available space
    const startX = marginX + (availableWidth - (cols - 1) * xSpacing) / 2;
    const startY = marginY + (availableHeight - (rows - 1) * ySpacing) / 2;
    
    const jitterX = (Math.random() - 0.5) * (point.size * 0.3);
    const jitterY = (Math.random() - 0.5) * (point.size * 0.3);
    
    point.x = startX + (col * xSpacing) + jitterX;
    point.y = startY + (row * ySpacing) + jitterY;
    
    point.x = Math.max(marginX, Math.min(100 - marginX, point.x));
    point.y = Math.max(marginY, Math.min(100 - marginY, point.y));
  });
  
  // Position unassociated role at the bottom-right if it exists
  if (unassociatedRole) {
    unassociatedRole.x = 85; // Position at bottom-right
    unassociatedRole.y = 85;
  }

  // Apply spacing optimization  
  optimizePointSpacing(points);
  
  return points;
}
/**
 * Process questions data for Documents-to-Chunks perspective
 * Each document hexagon contains multiple chunks, including unassociated chunks
 */
export function processDocumentsToChunks(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  // Build document map with chunk information
  const documentMap = new Map<string, {
    docId: string;
    title: string;
    chunks: Map<string, {
      chunkId: string;
      content: string;
      retrievalFrequency: number;
      totalSimilarity: number;
      questions: Array<{questionId: string; questionText: string; similarity: number; roleName?: string}>;
    }>;
    totalRetrievals: number;
    totalSimilarity: number;
  }>();

  // Initialize documents from retrieved chunks
  questionResults.forEach(question => {
    (question.retrieved_docs || []).forEach(doc => {
      const docKey = doc.doc_id || 'unknown';
      const chunkKey = doc.chunk_id || 'unknown';
      
      if (!documentMap.has(docKey)) {
        documentMap.set(docKey, {
          docId: doc.doc_id || 'unknown',
          title: doc.title || 'Unknown document',
          chunks: new Map(),
          totalRetrievals: 0,
          totalSimilarity: 0
        });
      }
      
      const document = documentMap.get(docKey)!;
      
      if (!document.chunks.has(chunkKey)) {
        document.chunks.set(chunkKey, {
          chunkId: doc.chunk_id || 'unknown',
          content: doc.content || '',
          retrievalFrequency: 0,
          totalSimilarity: 0,
          questions: []
        });
      }
      
      const chunk = document.chunks.get(chunkKey)!;
      chunk.retrievalFrequency++;
      chunk.totalSimilarity += (doc.similarity || 0) * 10; // Convert to 0-10 scale
      chunk.questions.push({
        questionId: question.id || 'unknown',
        questionText: question.text || 'Unknown question',
        similarity: (doc.similarity || 0) * 10,
        roleName: question.role_name
      });
      
      document.totalRetrievals++;
      document.totalSimilarity += (doc.similarity || 0) * 10;
    });
  });

  // Add unassociated chunks from allChunks to their respective documents
  if (allChunks) {
    allChunks.forEach(chunk => {
      const docKey = chunk.doc_id;
      const chunkKey = chunk.chunk_id;
      
      // Check if this chunk was already processed (retrieved by a question)
      let chunkExists = false;
      for (const doc of Array.from(documentMap.values())) {
        if (doc.chunks.has(chunkKey)) {
          chunkExists = true;
          break;
        }
      }
      
      if (!chunkExists) {
        // This is an unassociated chunk
        if (!documentMap.has(docKey)) {
          documentMap.set(docKey, {
            docId: chunk.doc_id,
            title: chunk.title,
            chunks: new Map(),
            totalRetrievals: 0,
            totalSimilarity: 0
          });
        }
        
        const document = documentMap.get(docKey)!;
        document.chunks.set(chunkKey, {
          chunkId: chunk.chunk_id,
          content: chunk.content,
          retrievalFrequency: 0,
          totalSimilarity: 0,
          questions: []
        });
      }
    });
  }

  // Calculate max values for normalization
  const maxTotalRetrievals = Math.max(...Array.from(documentMap.values()).map(doc => doc.totalRetrievals), 1);
  const maxChunkCount = Math.max(...Array.from(documentMap.values()).map(doc => doc.chunks.size), 1);

  console.log('📋 Documents found:', {
    totalDocuments: documentMap.size,
    documentIds: Array.from(documentMap.keys()),
    documentDetails: Array.from(documentMap.entries()).map(([id, doc]) => ({
      docId: id,
      title: doc.title,
      chunkCount: doc.chunks.size,
      totalRetrievals: doc.totalRetrievals
    }))
  });

  // Convert to HeatmapPoint array
  const points: HeatmapPoint[] = Array.from(documentMap.entries()).map(([docId, document], index) => {
    // Process chunks for this document
    const chunks = Array.from(document.chunks.entries()).map(([chunkId, chunk]) => {
      const avgSimilarity = chunk.retrievalFrequency > 0 ? chunk.totalSimilarity / chunk.retrievalFrequency : 0;
      const bestQuestion = chunk.questions.length > 0 
        ? chunk.questions.reduce((best, q) => q.similarity > best.similarity ? q : best, chunk.questions[0])
        : undefined;
        
      return {
        chunkId: chunk.chunkId,
        content: chunk.content,
        retrievalFrequency: chunk.retrievalFrequency,
        avgSimilarity: avgSimilarity,
        isUnretrieved: chunk.retrievalFrequency === 0,
        bestRetrievingQuestion: bestQuestion ? {
          questionId: bestQuestion.questionId,
          questionText: bestQuestion.questionText,
          similarity: bestQuestion.similarity,
          roleName: bestQuestion.roleName
        } : undefined
      };
    });

    // Find top retrieving questions for this document
    const questionRetrieval = new Map<string, {questionId: string; questionText: string; source: string; roleName?: string; chunksRetrieved: number; totalSimilarity: number}>();
    
    document.chunks.forEach(chunk => {
      chunk.questions.forEach(q => {
        if (!questionRetrieval.has(q.questionId)) {
          const question = questionResults.find(qr => qr.id === q.questionId);
          questionRetrieval.set(q.questionId, {
            questionId: q.questionId,
            questionText: q.questionText,
            source: question?.source || 'unknown',
            roleName: q.roleName,
            chunksRetrieved: 0,
            totalSimilarity: 0
          });
        }
        const qData = questionRetrieval.get(q.questionId)!;
        qData.chunksRetrieved++;
        qData.totalSimilarity += q.similarity;
      });
    });

    const topRetrievingQuestions = Array.from(questionRetrieval.values())
      .map(q => ({
        questionId: q.questionId,
        questionText: q.questionText,
        source: q.source,
        roleName: q.roleName,
        chunksRetrieved: q.chunksRetrieved,
        avgSimilarity: q.chunksRetrieved > 0 ? q.totalSimilarity / q.chunksRetrieved : 0
      }))
      .sort((a, b) => b.chunksRetrieved - a.chunksRetrieved || b.avgSimilarity - a.avgSimilarity)
      .slice(0, 5);

    const avgSimilarity = document.totalRetrievals > 0 ? document.totalSimilarity / document.totalRetrievals : 0;
    const unassociatedChunkCount = chunks.filter(c => c.isUnretrieved).length;
    
    const documentData: DocumentHeatmapData = {
      type: 'document',
      docId: document.docId,
      title: document.title,
      chunkCount: chunks.length,
      chunks: chunks,
      totalRetrievals: document.totalRetrievals,
      avgSimilarity: avgSimilarity,
      unassociatedChunkCount: unassociatedChunkCount,
      topRetrievingQuestions: topRetrievingQuestions
    };

    // Size DIRECTLY proportional to chunk count - simplified linear scaling
    const chunkCountRatio = chunks.length / maxChunkCount;
    
    // Simple linear sizing: more chunks = proportionally larger hexagon
    // Range: 3.0 to 8.0 (reasonable size difference without extreme variations)
    const hexagonSize = 3.0 + (chunkCountRatio * 5.0);

    return {
      id: `document_${document.docId}`,
      x: 0, // Will be positioned later
      y: 0, // Will be positioned later  
      size: hexagonSize,
      color: avgSimilarity, // Color based on average similarity
      opacity: document.totalRetrievals > 0 ? 0.8 : 0.6, // Slightly higher opacity for documents with only unassociated chunks
      data: documentData
    };
  });

  // Position documents with much more aggressive separation from unassociated clusters
  const maxSize = Math.max(...points.map(p => p.size));
  
  // Reserve much more space for unassociated clusters around the perimeter
  const perimeterMargin = Math.max(35, maxSize * 6); // Much larger margin for complete separation
  
  // Calculate available space in the center for document clusters
  const availableWidth = 100 - (perimeterMargin * 2);
  const availableHeight = 100 - (perimeterMargin * 2);
  
  // Use a very spread out grid layout for documents
  const cols = Math.min(Math.ceil(Math.sqrt(points.length)), 2); // Reduce to 2 columns for maximum spacing
  const rows = Math.ceil(points.length / cols);
  
  // Add much more extra spacing between clusters
  const extraSpacing = 30; // Much more additional space between clusters
  const xSpacing = cols > 1 ? (availableWidth + extraSpacing) / (cols - 1) : 0;
  const ySpacing = rows > 1 ? (availableHeight + extraSpacing) / (rows - 1) : 0;
  
  points.forEach((point, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    // Center the grid in the available space
    const startX = perimeterMargin + (availableWidth - (cols - 1) * xSpacing) / 2;
    const startY = perimeterMargin + (availableHeight - (rows - 1) * ySpacing) / 2;
    
    // Add minimal jitter to prevent perfect alignment
    const jitterX = (Math.random() - 0.5) * (point.size * 0.3);
    const jitterY = (Math.random() - 0.5) * (point.size * 0.3);
    
    point.x = startX + (col * xSpacing) + jitterX;
    point.y = startY + (row * ySpacing) + jitterY;
    
    // Ensure points stay within the reserved center area
    point.x = Math.max(perimeterMargin, Math.min(100 - perimeterMargin, point.x));
    point.y = Math.max(perimeterMargin, Math.min(100 - perimeterMargin, point.y));
  });

  // Apply spacing optimization  
  optimizePointSpacing(points);
  
  console.log('✨ Final document points:', points.length, points.map(p => ({
    id: p.id,
    docId: p.data.type === 'document' ? p.data.docId : 'not-document',
    title: p.data.type === 'document' ? p.data.title : 'not-document',
    size: p.size,
    chunkCount: p.data.type === 'document' ? p.data.chunkCount : 0,
    retrievedChunks: p.data.type === 'document' ? p.data.chunks.filter(c => !c.isUnretrieved).length : 0,
    unassociatedChunks: p.data.type === 'document' ? p.data.unassociatedChunkCount : 0
  })));
  
  return points;
}