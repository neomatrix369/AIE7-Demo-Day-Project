/**
 * Refactored heatmap processors using shared core utilities
 * This eliminates duplication and ensures consistency
 */

import { QuestionResult } from '../types';
import { HeatmapPoint, positionAssociatedChunks } from './heatmapData';
import { 
  DocumentHeatmapData, 
  RoleHeatmapData, 
  ChunkHeatmapData,
  QuestionHeatmapData,
  UnassociatedClusterHeatmapData
} from './heatmapData';
import {
  RetrievableEntity,
  buildEntityMapFromQuestions,
  addUnretrievedChunks,
  entityToHeatmapPoint,
  createUnretrievedClusters,
  validateHeatmapConsistency,
  calculateStandardSize,
  calculateStandardColor,
  calculateStandardOpacity
} from './heatmapCore';

// =============================================================================
// DOCUMENT PROCESSOR (REFACTORED)
// =============================================================================

interface DocumentEntity extends RetrievableEntity {
  docId: string;
  title: string;
}

export function processDocumentsToChunksRefactored(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  
  // Create defensive copies to prevent mutation of input data
  const questionResultsCopy = [...questionResults];
  const allChunksCopy = allChunks ? [...allChunks] : undefined;
  
  // Use shared entity map builder
  const documentMap = buildEntityMapFromQuestions<DocumentEntity>(
    questionResultsCopy,
    (doc) => doc.doc_id || 'unknown', // entityKeyExtractor
    (doc) => ({                       // entityFactory
      id: doc.doc_id || 'unknown',
      docId: doc.doc_id || 'unknown',
      title: doc.title || 'Unknown document'
    })
  );

  // Add unretrieved chunks using shared utility
  if (allChunksCopy) {
    addUnretrievedChunks(
      documentMap,
      allChunksCopy,
      (chunk) => chunk.doc_id,        // entityKeyExtractor
      (chunk) => ({                   // entityFactory
        id: chunk.doc_id,
        docId: chunk.doc_id,
        title: chunk.title
      })
    );
  }

  // Calculate max values for normalization
  const maxChunkCount = Math.max(
    ...Array.from(documentMap.values()).map(doc => doc.chunks.size), 
    1
  );

  // Convert documents to heatmap points using shared utility
  const documentPoints = Array.from(documentMap.values()).map(document =>
    entityToHeatmapPoint<DocumentEntity, DocumentHeatmapData>(
      document,
      'document',
      maxChunkCount,
      (doc) => ({
        type: 'document',
        docId: doc.docId,
        title: doc.title,
        chunkCount: doc.chunks.size,
        chunks: Array.from(doc.chunks.values()).map(chunk => ({
          chunkId: chunk.chunkId,
          content: chunk.content,
          docId: chunk.docId,
          title: chunk.title,
          avgSimilarity: chunk.retrievalFrequency > 0 
            ? chunk.totalSimilarity / chunk.retrievalFrequency 
            : 0,
          retrievalFrequency: chunk.retrievalFrequency,
          isUnretrieved: chunk.isUnretrieved || false,
          bestRetrievingQuestion: chunk.questions.length > 0
            ? {
                questionId: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).questionId,
                questionText: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).questionText,
                similarity: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).similarity,
                source: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).source || 'unknown'
              }
            : undefined
        })),
        totalRetrievals: doc.totalRetrievals,
        avgSimilarity: doc.totalRetrievals > 0 
          ? doc.totalSimilarity / doc.totalRetrievals 
          : 0,
        unassociatedChunkCount: Array.from(doc.chunks.values())
          .filter(chunk => chunk.isUnretrieved).length,
        topRetrievingQuestions: Array.from(doc.chunks.values())
          .flatMap(chunk => chunk.questions)
          .reduce((acc: any[], question) => {
            const existing = acc.find(q => q.questionId === question.questionId);
            if (existing) {
              existing.chunksRetrieved++;
              existing.totalSimilarity += question.similarity;
            } else {
              acc.push({
                questionId: question.questionId,
                questionText: question.questionText,
                source: question.source || 'unknown',
                chunksRetrieved: 1,
                totalSimilarity: question.similarity
              });
            }
            return acc;
          }, [])
          .map(q => ({
            ...q,
            avgSimilarity: q.totalSimilarity / q.chunksRetrieved
          }))
          .sort((a, b) => b.avgSimilarity - a.avgSimilarity)
          .slice(0, 5)
      })
    ) as HeatmapPoint
  );

  // For documents-to-chunks, unretrieved chunks are handled within documents via addUnretrievedChunks()
  // No need for separate unretrieved clusters as they appear inside document hexagons
  const allPoints = [...documentPoints];

  // Validate consistency
  const validation = validateHeatmapConsistency(allPoints);
  if (!validation.isValid) {
    console.warn('🚨 Heatmap consistency issues detected:', validation.issues);
  }

  console.log('📊 Documents processed (refactored):', {
    documentCount: documentPoints.length,
    totalDocumentChunks: Array.from(documentMap.values()).reduce((sum, doc) => sum + doc.chunks.size, 0),
    validation: validation.isValid ? '✅' : '⚠️',
    timestamp: new Date().toISOString()
  });

  return allPoints;
}

// =============================================================================
// ROLE PROCESSOR (REFACTORED)  
// =============================================================================

interface RoleEntity extends RetrievableEntity {
  roleId: string;
  roleName: string;
}

export function processRolesToChunksRefactored(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  
  // Create defensive copies to prevent mutation of input data
  const questionResultsCopy = [...questionResults];
  const allChunksCopy = allChunks ? [...allChunks] : undefined;
  
  // Use shared entity map builder  
  const roleMap = buildEntityMapFromQuestions<RoleEntity>(
    questionResultsCopy,
    (_, question) => question?.role_name || 'Unknown Role', // entityKeyExtractor
    (_, question) => ({                                     // entityFactory
      id: (question?.role_name || 'Unknown Role').toLowerCase().replace(/\s+/g, '_'),
      roleId: (question?.role_name || 'Unknown Role').toLowerCase().replace(/\s+/g, '_'),
      roleName: question?.role_name || 'Unknown Role'
    })
  );

  // Add unretrieved chunks using role-specific document-based distribution
  if (allChunksCopy) {
    // Find retrieved chunk IDs
    const retrievedChunkIds = new Set<string>();
    roleMap.forEach(role => {
      role.chunks.forEach((_, chunkId) => retrievedChunkIds.add(chunkId));
    });
    
    const unassociatedChunks = allChunksCopy.filter(chunk => !retrievedChunkIds.has(chunk.chunk_id));
    
    // Group unassociated chunks by document and distribute to roles that have chunks from same document
    const documentToRoles = new Map<string, Set<string>>();
    roleMap.forEach(role => {
      role.chunks.forEach(chunk => {
        const chunkData = role.chunks.get(chunk.chunkId);
        if (chunkData && !documentToRoles.has(chunkData.docId)) {
          documentToRoles.set(chunkData.docId, new Set());
        }
        if (chunkData) {
          documentToRoles.get(chunkData.docId)!.add(role.roleName);
        }
      });
    });
    
    // Distribute unassociated chunks to roles based on document associations
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
            questions: [],
            isUnretrieved: true
          });
          distributedChunks.add(chunk.chunk_id);
        }
      }
    });
    
    // Create separate "Unassociated Chunks" role for remaining chunks
    const remainingChunks = unassociatedChunks.filter(chunk => !distributedChunks.has(chunk.chunk_id));
    if (remainingChunks.length > 0) {
      const unassociatedRoleName = 'Unassociated Chunks';
      const unassociatedRole: RoleEntity = {
        id: 'unassociated_chunks',
        roleId: 'unassociated_chunks', 
        roleName: unassociatedRoleName,
        chunks: new Map(),
        totalRetrievals: 0,
        totalSimilarity: 0
      };
      
      remainingChunks.forEach(chunk => {
        unassociatedRole.chunks.set(chunk.chunk_id, {
          chunkId: chunk.chunk_id,
          content: chunk.content,
          docId: chunk.doc_id,
          title: chunk.title,
          retrievalFrequency: 0,
          totalSimilarity: 0,
          questions: [],
          isUnretrieved: true
        });
      });
      
      roleMap.set(unassociatedRoleName, unassociatedRole);
    }
  }

  // Calculate max values for normalization
  const maxChunkCount = Math.max(
    ...Array.from(roleMap.values()).map(role => role.chunks.size), 
    1
  );

  // Convert roles to heatmap points using shared utility
  const rolePoints = Array.from(roleMap.values()).map(role =>
    entityToHeatmapPoint<RoleEntity, RoleHeatmapData>(
      role,
      'role', 
      maxChunkCount,
      (r) => ({
        type: 'role',
        roleId: r.roleId,
        roleName: r.roleName,
        chunkCount: r.chunks.size,
        chunks: Array.from(r.chunks.values()).map(chunk => ({
          chunkId: chunk.chunkId,
          content: chunk.content,
          docId: chunk.docId,
          title: chunk.title,
          retrievalFrequency: chunk.retrievalFrequency,
          avgSimilarity: chunk.retrievalFrequency > 0 
            ? chunk.totalSimilarity / chunk.retrievalFrequency 
            : 0,
          isUnretrieved: chunk.isUnretrieved || false,
          bestRetrievingQuestion: chunk.questions.length > 0
            ? {
                questionId: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).questionId,
                questionText: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).questionText,
                similarity: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).similarity,
                source: chunk.questions.reduce((best, current) => 
                  current.similarity > best.similarity ? current : best
                ).source || 'unknown'
              }
            : undefined
        })),
        totalRetrievals: r.totalRetrievals,
        avgSimilarity: r.totalRetrievals > 0 
          ? r.totalSimilarity / r.totalRetrievals 
          : 0,
        unassociatedChunkCount: Array.from(r.chunks.values())
          .filter(chunk => chunk.isUnretrieved).length,
        topRetrievingQuestions: Array.from(r.chunks.values())
          .flatMap(chunk => chunk.questions)
          .reduce((acc: any[], question) => {
            const existing = acc.find(q => q.questionId === question.questionId);
            if (existing) {
              existing.chunksRetrieved++;
              existing.totalSimilarity += question.similarity;
            } else {
              acc.push({
                questionId: question.questionId,
                questionText: question.questionText,
                source: question.source || 'unknown',
                chunksRetrieved: 1,
                totalSimilarity: question.similarity
              });
            }
            return acc;
          }, [])
          .map(q => ({
            ...q,
            avgSimilarity: q.totalSimilarity / q.chunksRetrieved
          }))
          .sort((a, b) => b.avgSimilarity - a.avgSimilarity)
          .slice(0, 5) // Top 5
      })
    ) as HeatmapPoint
  );

  // For roles-to-chunks, unretrieved chunks are handled within roles or the "Unassociated Chunks" role
  // No need for separate unretrieved clusters as they appear inside role hexagons
  const allPoints = [...rolePoints];

  // Validate consistency
  const validation = validateHeatmapConsistency(allPoints);
  if (!validation.isValid) {
    console.warn('🚨 Heatmap consistency issues detected:', validation.issues);
  }

  console.log('📊 Roles processed (refactored):', {
    roleCount: rolePoints.length,
    totalRoleChunks: Array.from(roleMap.values()).reduce((sum, role) => sum + role.chunks.size, 0),
    roles: Array.from(roleMap.keys()),
    validation: validation.isValid ? '✅' : '⚠️',
    timestamp: new Date().toISOString()
  });

  return allPoints;
}

// =============================================================================
// CHUNKS PROCESSOR (REFACTORED)
// =============================================================================

export function processChunksToQuestionsRefactored(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  
  // Create defensive copies to prevent mutation of input data
  const questionResultsCopy = [...questionResults];
  const allChunksCopy = allChunks ? [...allChunks] : undefined;
  
  console.log('🔍 Chunks-to-questions input debug:', {
    questionResultsCount: questionResultsCopy.length,
    allChunksCount: allChunksCopy?.length || 0,
    sampleQuestion: questionResultsCopy[0] ? {
      id: questionResultsCopy[0].id,
      retrievedDocsCount: questionResultsCopy[0].retrieved_docs?.length || 0,
      sampleDoc: questionResultsCopy[0].retrieved_docs?.[0]?.chunk_id
    } : null
  });
  
  // Build chunk map (different pattern from documents/roles)
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

  // Process retrieved chunks
  questionResultsCopy.forEach(question => {
    const retrievedDocs = question.retrieved_docs || [];
    retrievedDocs.forEach(doc => {
      const chunkId = doc.chunk_id || 'unknown';
      
      if (!chunkMap.has(chunkId)) {
        const allChunk = allChunksCopy?.find(chunk => chunk.chunk_id === chunkId);
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
        similarity: (doc.similarity ?? 0) * 10,
        roleName: question.role_name || 'Unknown Role'
      });
      chunk.totalSimilarity += (doc.similarity ?? 0) * 10;
    });
  });

  const retrievedChunks = Array.from(chunkMap.values());
  const maxRetrievalFrequency = Math.max(...retrievedChunks.map(c => c.questions.length), 1);

  // Create retrieved chunk points using original chunks-to-questions formula
  const retrievedChunkPoints: HeatmapPoint[] = retrievedChunks.map((chunk) => {
    const avgSimilarity = chunk.totalSimilarity / chunk.questions.length;
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
      y: 0,
      size: Math.max(0.6, (chunk.questions.length / maxRetrievalFrequency) * 1.0 * (0.8 + (avgSimilarity / 10) * 0.2)),
      color: avgSimilarity, // Use actual average similarity
      opacity: 0.8, // Fixed visible opacity like original
      data: chunkData
    };
  });

  // Create unretrieved clusters positioned around the outer perimeter of associated chunks
  const retrievedChunkIds = new Set(retrievedChunks.map(chunk => chunk.chunkId));
  const unretrievedChunks = allChunksCopy?.filter(chunk => !retrievedChunkIds.has(chunk.chunk_id)) || [];

  // For chunks-to-questions, position unassociated chunks around the outer ring of associated chunks
  const unretrievedClusters = createChunksToQuestionsUnretrievedClusters(unretrievedChunks, {
    targetClusterCount: Math.min(16, Math.max(6, Math.ceil(unretrievedChunks.length / 30))),
    sizeMethod: 'linear'
  });

  const allPoints = [...retrievedChunkPoints, ...unretrievedClusters];

  // Position the retrieved chunks using the shared positioning algorithm
  positionAssociatedChunks(retrievedChunkPoints);

  // Validate consistency  
  const validation = validateHeatmapConsistency(allPoints);
  if (!validation.isValid) {
    console.warn('🚨 Heatmap consistency issues detected:', validation.issues);
  }

  console.log('📊 Chunks processed (refactored):', {
    questionResultsCount: questionResultsCopy.length,
    retrievedChunks: retrievedChunkPoints.length,
    unretrievedClusters: unretrievedClusters.length,
    totalUnretrievedChunks: unretrievedChunks.length,
    totalPoints: allPoints.length,
    maxRetrievalFrequency,
    sampleChunks: retrievedChunks.slice(0, 2).map(chunk => ({
      id: chunk.chunkId,
      questionCount: chunk.questions.length,
      avgSimilarity: chunk.totalSimilarity / chunk.questions.length,
      size: Math.max(0.6, (chunk.questions.length / maxRetrievalFrequency) * 1.0 * (0.8 + ((chunk.totalSimilarity / chunk.questions.length) / 10) * 0.2))
    })),
    validation: validation.isValid ? '✅' : '⚠️',
    timestamp: new Date().toISOString()
  });

  return allPoints;
}

// =============================================================================
// CHUNKS-TO-QUESTIONS SPECIFIC HELPERS
// =============================================================================

/**
 * Create unretrieved clusters positioned around the outer perimeter of associated chunks
 * This creates a concentric layout where associated chunks are in center and unassociated surround them
 */
function createChunksToQuestionsUnretrievedClusters(
  unretrievedChunks: Array<{chunk_id: string; doc_id: string; title: string; content: string}>,
  config: { targetClusterCount: number; sizeMethod: 'linear' | 'logarithmic' | 'proportional' }
): HeatmapPoint[] {
  if (unretrievedChunks.length === 0) return [];

  // Create defensive copy to prevent input mutation
  const unretrievedChunksCopy = [...unretrievedChunks];

  // Define positions around the outer perimeter of the associated chunks area
  // Associated chunks use 20-80% of viewport, so we position unassociated at 85-95% radius from center
  const centerX = 50, centerY = 50;
  const innerRadius = 35; // Just outside the associated chunks area (which goes to ~30% from center)
  const outerRadius = 45; // Create a ring around the associated chunks

  const clusterPositions: Array<{ x: number; y: number }> = [];
  
  // Create circular positions around the associated chunks
  const angleStep = (2 * Math.PI) / config.targetClusterCount;
  
  for (let i = 0; i < config.targetClusterCount; i++) {
    const angle = i * angleStep;
    
    // Alternate between inner and outer radius for variety
    const radius = i % 2 === 0 ? innerRadius : outerRadius;
    
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // Ensure positions stay within viewport bounds
    const boundedX = Math.max(5, Math.min(95, x));
    const boundedY = Math.max(5, Math.min(95, y));
    
    clusterPositions.push({ x: boundedX, y: boundedY });
  }

  // Create clusters
  const clusters: Array<{ id: string; chunks: typeof unretrievedChunksCopy; position: { x: number; y: number } }> = [];
  
  clusterPositions.forEach((pos, index) => {
    clusters.push({
      id: `surrounding_cluster_${index}`,
      chunks: [],
      position: pos
    });
  });

  // Distribute chunks among clusters (round-robin)
  unretrievedChunksCopy.forEach((chunk, index) => {
    const clusterIndex = index % clusters.length;
    clusters[clusterIndex].chunks.push(chunk);
  });

  // Convert to HeatmapPoints
  const maxClusterSize = Math.max(...clusters.map(c => c.chunks.length), 1);
  
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
      centerPosition: { x: cluster.position.x, y: cluster.position.y },
      chunks: cluster.chunks.map(chunk => ({
        chunkId: chunk.chunk_id,
        docId: chunk.doc_id,
        title: chunk.title,
        content: chunk.content
      })),
      documentBreakdown: Array.from(documentBreakdown.entries()).map(([docId, data]) => ({
        docId,
        title: data.title,
        chunkCount: data.count
      }))
    };

    return {
      id: cluster.id,
      x: cluster.position.x,
      y: cluster.position.y,
      size: calculateStandardSize(cluster.chunks.length, maxClusterSize),
      color: calculateStandardColor(0, cluster.chunks.length, true), // isUnretrieved = true
      opacity: calculateStandardOpacity(false), // No retrievals
      data: clusterData
    };
  });
}

// =============================================================================
// QUESTIONS PROCESSOR (REFACTORED)
// =============================================================================

export function processQuestionsToChunksRefactored(
  questionResults: QuestionResult[],
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>
): HeatmapPoint[] {
  
  // Create defensive copies to prevent mutation of input data
  const questionResultsCopy = [...questionResults];
  const allChunksCopy = allChunks ? [...allChunks] : undefined;
  
  // Build question map with retrieved chunks
  const questionMap = new Map<string, {
    questionId: string;
    questionText: string;
    source: string;
    roleName: string;
    chunks: Array<{
      chunkId: string;
      docId: string;
      title: string;
      content: string;
      similarity: number;
    }>;
    totalSimilarity: number;
  }>();

  // Process questions and their retrieved chunks
  questionResultsCopy.forEach(question => {
    const questionId = question.id || 'unknown';
    
    if (!questionMap.has(questionId)) {
      questionMap.set(questionId, {
        questionId,
        questionText: question.text || 'Unknown question',
        source: question.source || 'unknown',
        roleName: question.role_name || 'Unknown Role',
        chunks: [],
        totalSimilarity: 0
      });
    }

    const questionData = questionMap.get(questionId)!;
    
    (question.retrieved_docs || []).forEach(doc => {
      const similarity = (doc.similarity || 0) * 10;
      questionData.chunks.push({
        chunkId: doc.chunk_id || 'unknown',
        docId: doc.doc_id || 'unknown',
        title: doc.title || 'Unknown document',
        content: doc.content || '',
        similarity
      });
      questionData.totalSimilarity += similarity;
    });
  });

  const questions = Array.from(questionMap.values());
  const maxChunkCount = Math.max(...questions.map(q => q.chunks.length), 1);

  // Create question points using shared utility
  const questionPoints: HeatmapPoint[] = questions.map((question) => {
    const avgSimilarity = question.chunks.length > 0 
      ? question.totalSimilarity / question.chunks.length 
      : 0;

    const questionData: QuestionHeatmapData = {
      type: 'question',
      questionId: question.questionId,
      questionText: question.questionText,
      source: question.source,
      qualityScore: avgSimilarity,
      status: avgSimilarity >= 7.0 ? 'good' : avgSimilarity >= 5.0 ? 'weak' : 'poor',
      avgSimilarity,
      chunkFrequency: question.chunks.length,
      retrievedChunks: question.chunks.map(chunk => ({
        chunkId: chunk.chunkId,
        docId: chunk.docId,
        title: chunk.title,
        content: chunk.content,
        similarity: chunk.similarity
      }))
    };

    return {
      id: question.questionId,
      x: 0, // Will be positioned later
      y: 0,
      size: calculateStandardSize(question.chunks.length, maxChunkCount),
      color: calculateStandardColor(question.totalSimilarity, question.chunks.length),
      opacity: calculateStandardOpacity(question.chunks.length > 0),
      data: questionData
    };
  });

  // Create unretrieved clusters using shared utility
  const retrievedChunkIds = new Set(
    questions.flatMap(q => q.chunks.map(chunk => chunk.chunkId))
  );
  const unretrievedChunks = allChunksCopy?.filter(chunk => 
    !retrievedChunkIds.has(chunk.chunk_id)
  ) || [];

  const unretrievedClusters = createUnretrievedClusters(unretrievedChunks, {
    targetClusterCount: Math.min(16, Math.max(6, Math.ceil(unretrievedChunks.length / 30))),
    positionStrategy: 'perimeter',
    sizeMethod: 'linear'
  });

  const allPoints = [...questionPoints, ...unretrievedClusters];

  // Validate consistency
  const validation = validateHeatmapConsistency(allPoints);
  if (!validation.isValid) {
    console.warn('🚨 Heatmap consistency issues detected:', validation.issues);
  }

  console.log('📊 Questions processed (refactored):', {
    questionCount: questionPoints.length,
    unretrievedClusters: unretrievedClusters.length,
    totalUnretrievedChunks: unretrievedChunks.length,
    validation: validation.isValid ? '✅' : '⚠️',
    timestamp: new Date().toISOString()
  });

  return allPoints;
}

// =============================================================================
// MIGRATION UTILITIES
// =============================================================================

/**
 * Helper to gradually migrate from old processors to new ones
 */
export function enableRefactoredProcessors() {
  console.log('🔄 Enabling refactored heatmap processors for consistency');
  
  // You can gradually switch processors here
  return {
    processDocumentsToChunks: processDocumentsToChunksRefactored,
    processRolesToChunks: processRolesToChunksRefactored,
    processChunksToQuestions: processChunksToQuestionsRefactored,
    processQuestionsToChunks: processQuestionsToChunksRefactored
  };
}