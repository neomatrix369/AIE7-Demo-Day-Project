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
  data: QuestionHeatmapData | ChunkHeatmapData | RoleHeatmapData | ChunkToRoleHeatmapData | UnassociatedClusterHeatmapData;
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

/**
 * Position associated chunks in the inner area with consistent grid-based spacing
 */
function positionAssociatedChunks(retrievedChunkPoints: HeatmapPoint[]): void {
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

  // Define cluster positions around the perimeter in a strategic pattern
  const clusterPositions = [
    // Top edge
    { x: 15, y: 10 }, { x: 35, y: 8 }, { x: 65, y: 8 }, { x: 85, y: 10 },
    // Right edge  
    { x: 90, y: 25 }, { x: 92, y: 50 }, { x: 90, y: 75 },
    // Bottom edge
    { x: 85, y: 90 }, { x: 65, y: 92 }, { x: 35, y: 92 }, { x: 15, y: 90 },
    // Left edge
    { x: 8, y: 75 }, { x: 10, y: 50 }, { x: 8, y: 25 }
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
  return clusters.map((cluster) => {
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

    // Calculate size based on proportion to total chunks and make 5x larger than smallest associated
    const clusterChunkCount = cluster.chunks.length;
    const totalChunks = totalAssociatedChunks + unassociatedChunks.length;
    
    // Base size: proportion of chunks this cluster represents
    const chunkProportion = clusterChunkCount / Math.max(totalChunks, 1);
    
    // Scale factor: 5x the minimum associated chunk size
    const scaleFactor = minAssociatedChunkSize * 5.0;
    
    // Final size: proportion-based scaling starting from 5x minimum associated size
    const proportionalSize = scaleFactor * (0.5 + (chunkProportion * 10)); // Multiply by 10 to make proportion more visible
    
    // Cluster intensity for color variation
    const maxClusterSize = Math.max(...clusters.map(c => c.chunks.length), 1);
    const clusterIntensity = clusterChunkCount / maxClusterSize;
    const visibleColor = 5.0 + (clusterIntensity * 2.0); // Range: 5.0 to 7.0 for good visibility

    return {
      id: cluster.id,
      x: cluster.position.x,
      y: cluster.position.y,
      size: Math.max(1.2, Math.min(proportionalSize / 3, 2.0)), // Normalize to 1.2-2.0 range for getScaledSize compatibility
      color: visibleColor, // Color range optimized for visibility
      opacity: 0.8, // Fixed visible opacity - use color and size for differentiation
      data: clusterData
    };
  });
  
  const heatmapPoints = clusters.map(cluster => {
    // Calculate size based on proportion to total chunks and make 5x larger than smallest associated
    const clusterChunkCount = cluster.chunks.length;
    const totalChunks = totalAssociatedChunks + unassociatedChunks.length;
    
    // Base size: proportion of chunks this cluster represents
    const chunkProportion = clusterChunkCount / Math.max(totalChunks, 1);
    
    // Scale factor: 5x the minimum associated chunk size
    const scaleFactor = minAssociatedChunkSize * 5.0;
    
    // Final size: proportion-based scaling starting from 5x minimum associated size
    const proportionalSize = scaleFactor * (0.5 + (chunkProportion * 10)); // Multiply by 10 to make proportion more visible
    
    // Cluster intensity for color variation
    const maxClusterSize = Math.max(...clusters.map(c => c.chunks.length), 1);
    const clusterIntensity = clusterChunkCount / maxClusterSize;
    const visibleColor = 5.0 + (clusterIntensity * 2.0); // Range: 5.0 to 7.0 for good visibility
    
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
      size: Math.max(1.2, Math.min(proportionalSize / 3, 2.0)), // Normalize to 1.2-2.0 range for getScaledSize compatibility
      color: visibleColor, // Color range optimized for visibility
      opacity: 0.8, // Fixed visible opacity - use color and size for differentiation
      data: clusterData
    };
  });
  
  console.log('✅ Created unassociated chunk points:', {
    pointCount: heatmapPoints.length,
    points: heatmapPoints.map(p => ({
      id: p.id,
      x: p.x,
      y: p.y,
      size: p.size,
      color: p.color,
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
  let clusteredUnassociatedPoints: HeatmapPoint[] = [];
  
  // Handle case where no chunks are found
  if (retrievedChunks.length === 0 && clusteredUnassociatedPoints.length === 0) {
    return [];
  }

  const maxRetrievalFrequency = Math.max(...retrievedChunks.map(c => c.questions.length), 1);

  // Update unassociated chunks to use proper size comparison
  if (allChunks) {
    const retrievedChunkIds = new Set(retrievedChunks.map(c => c.chunkId));
    const unassociatedChunks = allChunks.filter(chunk => !retrievedChunkIds.has(chunk.chunk_id));
    
    // Calculate minimum associated chunk size (from our size calculation above)
    const minAssociatedSize = 0.6; // This matches our Math.max(0.6, ...) in chunk size calculation
    
    // Group unassociated chunks into clusters with proper size comparison
    clusteredUnassociatedPoints = groupUnassociatedChunks(
      unassociatedChunks, 
      12, 
      maxRetrievalFrequency, 
      retrievedChunks.length,
      minAssociatedSize
    );
  }

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

  // Phase 1: Clustered unassociated chunks are already positioned around perimeter
  // (positions are set in groupUnassociatedChunks function)
  
  // Phase 2: Position associated chunks using common positioning logic
  positionAssociatedChunks(retrievedChunkPoints);

  // Combine all points for collision detection - clustered unassociated chunks first (background layer)
  const allPoints = [...clusteredUnassociatedPoints, ...retrievedChunkPoints];
  
  // Apply collision detection and spacing optimization
  optimizePointSpacing(allPoints);
  
  return allPoints;
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
      // For roles, determine status based on avgQualityScore
      const score = point.data.avgQualityScore;
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
        chunk.totalSimilarity += (doc.similarity || 0) * 10; // Convert to 0-10 scale
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
        avgSimilarity: chunk.totalSimilarity / chunk.retrievalCount // Already in 0-10 scale
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
      size: Math.max(0.6, Math.min(1.2, questions.length / 10 * (0.8 + (avgQualityScore / 10) * 0.2))), // Size based on question count and quality
      color: avgQualityScore, // Color based on average quality score
      opacity: 0.8, // Fixed visible opacity - use color and size for differentiation
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
    content: string;
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
        // Find content from allChunks if available
        const allChunk = allChunks?.find(chunk => chunk.chunk_id === chunkKey);
        
        chunkAccessMap.set(chunkKey, {
          chunkId: doc.chunk_id || 'unknown',
          docId: doc.doc_id || 'unknown',
          title: doc.title || 'Unknown document',
          content: doc.content || allChunk?.content || '',
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
      roleData.totalSimilarity += (doc.similarity || 0) * 10; // Convert to 0-10 scale
      roleData.questions.push({
        questionId: question.id || 'unknown',
        questionText: question.text || 'Unknown question',
        source: question.source || 'unknown',
        similarity: (doc.similarity || 0) * 10 // Convert to 0-10 scale
      });
      
      chunk.totalRetrievals++;
      chunk.totalSimilarity += (doc.similarity || 0) * 10; // Convert to 0-10 scale
    });
  });

  // Process retrieved chunks with role access
  const processedChunks = Array.from(chunkAccessMap.values());
  const retrievedChunkPoints: HeatmapPoint[] = [];
  const maxTotalRetrievals = Math.max(...processedChunks.map(c => c.totalRetrievals), 1);

  // Create clustered unassociated chunks if allChunks data is provided
  let clusteredUnassociatedPoints: HeatmapPoint[] = [];
  
  if (allChunks) {
    const retrievedChunkIds = new Set(Array.from(chunkAccessMap.keys()));
    const unassociatedChunks = allChunks.filter(chunk => !retrievedChunkIds.has(chunk.chunk_id));
    
    // Calculate minimum associated chunk size (from our size calculation below)
    const minAssociatedSize = 0.6; // This matches our Math.max(0.6, ...) in chunk size calculation
    
    // Group unassociated chunks into clusters with proper size comparison
    clusteredUnassociatedPoints = groupUnassociatedChunks(
      unassociatedChunks, 
      12, 
      maxTotalRetrievals, 
      processedChunks.length,
      minAssociatedSize
    );
  }

  processedChunks.forEach((chunk) => {
    // Handle chunks with role access
    const roleAccessArray = Array.from(chunk.roleAccess.entries()).map(([roleName, data]) => ({
      roleName,
      accessCount: data.accessCount,
      avgSimilarity: data.totalSimilarity / data.accessCount, // Already in 0-10 scale
      sampleQuestions: data.questions.slice(0, 3) // Top 3 questions
    }));

    // Find dominant role (role with most accesses)
    const dominantRoleEntry = roleAccessArray.reduce((max, current) => 
      current.accessCount > max.accessCount ? current : max
    );

    const avgSimilarity = chunk.totalSimilarity / chunk.totalRetrievals; // Already in 0-10 scale

    const chunkData: ChunkToRoleHeatmapData = {
      type: 'chunk-to-role',
      chunkId: chunk.chunkId,
      docId: chunk.docId,
      title: chunk.title,
      content: chunk.content,
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

    retrievedChunkPoints.push({
      id: `chunk_${chunk.chunkId}`,
      x: 0, // Will be positioned later
      y: 0, // Will be positioned later
      size: Math.max(0.6, Math.min(1.2, chunk.totalRetrievals / maxTotalRetrievals * (0.8 + (avgSimilarity / 10) * 0.2))), // Size based on retrievals and similarity
      color: avgSimilarity, // Color based on average similarity
      opacity: 0.8, // Fixed visible opacity - use color and size for differentiation
      data: chunkData
    });
  });

  // Phase 1: Clustered unassociated chunks are already positioned around perimeter
  // (positions are set in groupUnassociatedChunks function)
  
  // Phase 2: Position associated chunks using common positioning logic
  positionAssociatedChunks(retrievedChunkPoints);

  const finalPoints = [...clusteredUnassociatedPoints, ...retrievedChunkPoints];
  
  // Apply spacing optimization
  optimizePointSpacing(finalPoints);
  
  return finalPoints;
}