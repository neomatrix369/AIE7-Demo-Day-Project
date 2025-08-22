/**
 * Core heatmap utilities and shared patterns
 * Eliminates duplication across all heatmap perspectives
 */

import { QuestionResult } from '../types';
import { HeatmapPoint } from './heatmapData';

// Generic version of HeatmapPoint for internal use
interface GenericHeatmapPoint<TData = any> {
  id: string;
  x: number;
  y: number;
  size: number;
  color: number;
  opacity: number;
  screenX?: number;
  screenY?: number;
  data: TData;
}
import { 
  ChunkHeatmapData, 
  QuestionHeatmapData, 
  RoleHeatmapData, 
  DocumentHeatmapData,
  UnassociatedClusterHeatmapData 
} from './heatmapData';

// =============================================================================
// SHARED INTERFACES AND TYPES
// =============================================================================

export interface RetrievableEntity {
  id: string;
  chunks: Map<string, ChunkData>;
  totalRetrievals: number;
  totalSimilarity: number;
}

export interface ChunkData {
  chunkId: string;
  content: string;
  docId: string;
  title: string;
  retrievalFrequency: number;
  totalSimilarity: number;
  questions: QuestionReference[];
  isUnretrieved?: boolean;
}

export interface QuestionReference {
  questionId: string;
  questionText: string;
  similarity: number;
  roleName?: string;
  source?: string;
}

export interface ClusterConfig {
  targetClusterCount: number;
  positionStrategy: 'perimeter' | 'distributed' | 'scattered';
  sizeMethod: 'linear' | 'logarithmic' | 'proportional';
}

// =============================================================================
// SHARED VISUAL PROPERTY CALCULATORS
// =============================================================================

/**
 * Standard hexagon size calculation used across all heatmaps
 * Range: 3.0 to 8.0 for consistent visual scaling
 */
export function calculateStandardSize(
  entityCount: number, 
  maxEntityCount: number,
  sizeRange: { min: number; max: number } = { min: 3.0, max: 8.0 }
): number {
  const ratio = Math.max(0, Math.min(1, entityCount / Math.max(maxEntityCount, 1)));
  return sizeRange.min + (ratio * (sizeRange.max - sizeRange.min));
}

/**
 * Standard opacity calculation based on retrieval status
 */
export function calculateStandardOpacity(hasRetrievals: boolean): number {
  return hasRetrievals ? 0.8 : 0.6;
}

/**
 * Standard color calculation based on average similarity
 */
export function calculateStandardColor(
  totalSimilarity: number, 
  retrievalCount: number,
  isUnretrieved: boolean = false
): number {
  if (isUnretrieved) {
    // Use 5.0-7.0 range for unretrieved clusters (triggers brown colors)
    const intensity = Math.max(0, Math.min(1, retrievalCount / 50)); // Normalize based on cluster size
    return 5.0 + (intensity * 2.0);
  }
  
  if (retrievalCount === 0) return 0; // Grey for zero
  
  const avgSimilarity = totalSimilarity / retrievalCount;
  return avgSimilarity; // 0-10 quality score range
}

// =============================================================================
// SHARED DATA BUILDERS
// =============================================================================

/**
 * Builds entity map from question results - used by documents and roles
 */
export function buildEntityMapFromQuestions<TEntity extends RetrievableEntity>(
  questionResults: QuestionResult[],
  entityKeyExtractor: (doc: any, question?: QuestionResult) => string,
  entityFactory: (doc: any, question?: QuestionResult) => Omit<TEntity, 'chunks' | 'totalRetrievals' | 'totalSimilarity'>
): Map<string, TEntity> {
  const entityMap = new Map<string, TEntity>();

  // Create defensive copy to prevent input mutation
  const questionResultsCopy = [...questionResults];
  questionResultsCopy.forEach(question => {
    (question.retrieved_docs || []).forEach(doc => {
      const entityKey = entityKeyExtractor(doc, question);
      const chunkKey = doc.chunk_id || 'unknown';
      
      if (!entityMap.has(entityKey)) {
        const baseEntity = entityFactory(doc, question);
        entityMap.set(entityKey, {
          ...baseEntity,
          chunks: new Map(),
          totalRetrievals: 0,
          totalSimilarity: 0
        } as TEntity);
      }
      
      const entity = entityMap.get(entityKey)!;
      
      if (!entity.chunks.has(chunkKey)) {
        entity.chunks.set(chunkKey, {
          chunkId: doc.chunk_id || 'unknown',
          content: doc.content || '',
          docId: doc.doc_id || 'unknown',
          title: doc.title || 'Unknown document',
          retrievalFrequency: 0,
          totalSimilarity: 0,
          questions: []
        });
      }
      
      const chunk = entity.chunks.get(chunkKey)!;
      chunk.retrievalFrequency++;
      chunk.totalSimilarity += (doc.similarity || 0) * 10;
      chunk.questions.push({
        questionId: question.id || 'unknown',
        questionText: question.text || 'Unknown question',
        similarity: (doc.similarity || 0) * 10,
        roleName: question.role_name,
        source: question.source
      });
      
      entity.totalRetrievals++;
      entity.totalSimilarity += (doc.similarity || 0) * 10;
    });
  });

  return entityMap;
}

/**
 * Adds unretrieved chunks to entities
 */
export function addUnretrievedChunks<TEntity extends RetrievableEntity>(
  entityMap: Map<string, TEntity>,
  allChunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}>,
  entityKeyExtractor: (chunk: any) => string,
  entityFactory: (chunk: any) => Omit<TEntity, 'chunks' | 'totalRetrievals' | 'totalSimilarity'>
): void {
  if (!allChunks) return;

  // Create defensive copy to prevent input mutation
  const allChunksCopy = [...allChunks];

  // Find retrieved chunk IDs
  const retrievedChunkIds = new Set<string>();
  entityMap.forEach(entity => {
    entity.chunks.forEach((_, chunkId) => retrievedChunkIds.add(chunkId));
  });

  // Add unretrieved chunks
  allChunksCopy.forEach(chunk => {
    if (!retrievedChunkIds.has(chunk.chunk_id)) {
      const entityKey = entityKeyExtractor(chunk);
      
      if (!entityMap.has(entityKey)) {
        const baseEntity = entityFactory(chunk);
        entityMap.set(entityKey, {
          ...baseEntity,
          chunks: new Map(),
          totalRetrievals: 0,
          totalSimilarity: 0
        } as TEntity);
      }
      
      const entity = entityMap.get(entityKey)!;
      entity.chunks.set(chunk.chunk_id, {
        chunkId: chunk.chunk_id,
        content: chunk.content,
        docId: chunk.doc_id,
        title: chunk.title,
        retrievalFrequency: 0,
        totalSimilarity: 0,
        questions: [],
        isUnretrieved: true
      });
    }
  });
}

/**
 * Converts entity to standard heatmap point
 */
export function entityToHeatmapPoint<TEntity extends RetrievableEntity, TData>(
  entity: TEntity,
  entityType: string,
  maxEntitySize: number,
  dataFactory: (entity: TEntity) => TData
): GenericHeatmapPoint<TData> {
  const chunkCount = entity.chunks.size;

  return {
    id: `${entityType}_${entity.id}`,
    x: 0, // Will be positioned later
    y: 0, 
    size: calculateStandardSize(chunkCount, maxEntitySize),
    color: calculateStandardColor(entity.totalSimilarity, entity.totalRetrievals),
    opacity: calculateStandardOpacity(entity.totalRetrievals > 0),
    data: dataFactory(entity)
  };
}

// =============================================================================
// SHARED CLUSTERING UTILITIES
// =============================================================================

/**
 * Standard unretrieved chunk clustering
 */
export function createUnretrievedClusters(
  unretrievedChunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}>,
  config: ClusterConfig = {
    targetClusterCount: 8,
    positionStrategy: 'perimeter',
    sizeMethod: 'linear'
  }
): HeatmapPoint[] {
  if (unretrievedChunks.length === 0) return [];

  // Create defensive copy to prevent input mutation
  const unretrievedChunksCopy = [...unretrievedChunks];

  // Create clusters using shared logic
  const clusters = distributeChunksIntoClusters(unretrievedChunksCopy, config);
  const maxClusterSize = Math.max(...clusters.map(c => c.chunks.length), 1);
  
  return clusters.map((cluster, index) => {
    return {
      id: `unretrieved_cluster_${index}`,
      x: cluster.position.x,
      y: cluster.position.y,
      size: calculateStandardSize(cluster.chunks.length, maxClusterSize),
      color: calculateStandardColor(0, cluster.chunks.length, true), // isUnretrieved = true
      opacity: calculateStandardOpacity(false), // No retrievals
      data: createClusterData(cluster)
    };
  });
}

// Helper functions (reusing existing clustering logic)
function distributeChunksIntoClusters(
  chunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}>,
  config: ClusterConfig
): Array<{ id: string; chunks: typeof chunks; position: { x: number; y: number } }> {
  
  // Create defensive copy to avoid mutations
  const chunksCopy = [...chunks];
  const clusters: Array<{ id: string; chunks: typeof chunks; position: { x: number; y: number } }> = [];
  
  // Define cluster positions based on strategy
  let clusterPositions: Array<{ x: number; y: number }> = [];
  
  if (config.positionStrategy === 'perimeter') {
    // Enhanced grid-based distribution across entire viewport
    // Avoid center area (20-80% range) where associated chunks are positioned
    clusterPositions = [
      // Top area (0-15% height)
      { x: 10, y: 5 }, { x: 25, y: 8 }, { x: 40, y: 3 }, { x: 55, y: 7 }, { x: 70, y: 4 }, { x: 85, y: 9 },
      { x: 15, y: 12 }, { x: 35, y: 14 }, { x: 65, y: 11 }, { x: 90, y: 13 },
      
      // Upper sides (15-35% height)
      { x: 5, y: 18 }, { x: 95, y: 22 }, { x: 8, y: 28 }, { x: 92, y: 32 },
      
      // Mid sides (35-65% height) - further from center
      { x: 3, y: 40 }, { x: 97, y: 45 }, { x: 2, y: 55 }, { x: 98, y: 60 },
      
      // Lower sides (65-85% height)
      { x: 6, y: 68 }, { x: 94, y: 72 }, { x: 9, y: 78 }, { x: 91, y: 82 },
      
      // Bottom area (85-100% height)
      { x: 12, y: 87 }, { x: 28, y: 91 }, { x: 45, y: 89 }, { x: 62, y: 93 }, { x: 78, y: 88 }, { x: 88, y: 95 },
      { x: 20, y: 96 }, { x: 50, y: 97 }, { x: 75, y: 94 }, { x: 85, y: 98 }
    ];
  } else if (config.positionStrategy === 'distributed') {
    // Full viewport distribution for maximum spread
    const gridSize = Math.ceil(Math.sqrt(config.targetClusterCount * 1.5));
    clusterPositions = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (clusterPositions.length >= config.targetClusterCount) break;
        
        const x = (col / (gridSize - 1)) * 90 + 5; // 5-95% range
        const y = (row / (gridSize - 1)) * 90 + 5; // 5-95% range
        
        // Skip center area where associated chunks are positioned
        const centerX = 50, centerY = 50;
        const distanceFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (distanceFromCenter > 25) { // Avoid center 25% radius
          clusterPositions.push({ x, y });
        }
      }
    }
  }
  
  const actualClusterCount = Math.min(config.targetClusterCount, clusterPositions.length);
  const selectedPositions = clusterPositions.slice(0, actualClusterCount);

  // Initialize clusters
  selectedPositions.forEach((pos, index) => {
    clusters.push({
      id: `cluster_${index}`,
      chunks: [],
      position: pos
    });
  });

  // Distribute chunks among clusters (round-robin)
  chunksCopy.forEach((chunk, index) => {
    const clusterIndex = index % clusters.length;
    clusters[clusterIndex].chunks.push(chunk);
  });

  return clusters;
}

function createClusterData(cluster: { 
  id: string; 
  chunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}>; 
  position: { x: number; y: number } 
}): UnassociatedClusterHeatmapData {
  
  // Group chunks by document for breakdown
  const documentBreakdown = new Map<string, { title: string; count: number }>();
  cluster.chunks.forEach(chunk => {
    const docKey = chunk.doc_id;
    if (!documentBreakdown.has(docKey)) {
      documentBreakdown.set(docKey, { title: chunk.title, count: 0 });
    }
    documentBreakdown.get(docKey)!.count++;
  });

  return {
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
}

// =============================================================================
// VALIDATION AND CONSISTENCY CHECKS
// =============================================================================

/**
 * Validates that all heatmap points follow consistent patterns
 */
export function validateHeatmapConsistency(points: HeatmapPoint[]): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  points.forEach((point, index) => {
    // Check size range
    if (point.size < 0.1 || point.size > 10.0) {
      issues.push(`Point ${index}: Size ${point.size} outside expected range 0.1-10.0`);
    }
    
    // Check opacity values
    if (![0.6, 0.8, 0.9].includes(point.opacity)) {
      issues.push(`Point ${index}: Non-standard opacity ${point.opacity}`);
    }
    
    // Check color ranges
    if (point.color < 0 || point.color > 10) {
      issues.push(`Point ${index}: Color ${point.color} outside expected range 0-10`);
    }
  });
  
  return {
    isValid: issues.length === 0,
    issues
  };
}