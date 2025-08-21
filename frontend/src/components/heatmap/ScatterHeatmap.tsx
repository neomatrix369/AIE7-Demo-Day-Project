import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { QuestionResult, HeatmapPerspective, HeatmapDimensions, TooltipPosition } from '../../types';
import { 
  HeatmapPoint, 
  processQuestionsToChunks, 
  processChunksToQuestions, 
  processRolesToChunks,
  processDocumentsToChunks,
  getHeatmapColor, 
  getScaledSize, 
  optimizePositions,
  filterPointsByQuality 
} from '../../utils/heatmapData';
import HeatmapTooltip from './HeatmapTooltip';

interface ScatterHeatmapProps {
  questionResults: QuestionResult[];
  perspective: HeatmapPerspective;
  qualityFilter: 'all' | 'good' | 'weak' | 'poor';
  onPointClick?: (point: HeatmapPoint) => void;
  width?: number;
  height?: number;
  allChunks?: Array<{chunk_id: string; doc_id: string; title: string; content: string}>;
  totalChunks?: number;
  showTooltips?: boolean;
  pointSize?: 'small' | 'medium' | 'large';
}

const ScatterHeatmap: React.FC<ScatterHeatmapProps> = React.memo(({
  questionResults,
  perspective,
  qualityFilter,
  onPointClick,
  width = 800,
  height = 400,
  allChunks,
  totalChunks,
  showTooltips = true,
  pointSize = 'medium',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<HeatmapPoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
    visible: false
  });

  const { minSize, maxSize } = useMemo(() => {
    switch (pointSize) {
      case 'small':
        return { minSize: 4, maxSize: 12 };
      case 'large':
        return { minSize: 12, maxSize: 36 };
      case 'medium':
      default:
        return { minSize: 8, maxSize: 24 };
    }
  }, [pointSize]);
  

  const dimensions: HeatmapDimensions = useMemo(() => ({
    width,
    height,
    margin: { top: 20, right: 40, bottom: 60, left: 60 }
  }), [width, height]);

  const { innerWidth, innerHeight } = useMemo(() => ({
    innerWidth: dimensions.width - dimensions.margin.left - dimensions.margin.right,
    innerHeight: dimensions.height - dimensions.margin.top - dimensions.margin.bottom
  }), [dimensions]);

  // Memoize allChunks to prevent unnecessary re-renders when array content is the same
  const memoizedAllChunks = useMemo(() => allChunks, [allChunks]);

  // Process data based on perspective
  const heatmapPoints = useMemo(() => {
    if (questionResults.length === 0) return [];
    
    let points: HeatmapPoint[];
    
    if (perspective === 'documents-to-chunks') {
      console.log('🔍 Processing documents-to-chunks perspective:', {
        questionResultsCount: questionResults.length,
        allChunksCount: memoizedAllChunks?.length || 0,
        sampleQuestions: questionResults.slice(0, 2).map(q => ({
          id: q.id,
          docs: q.retrieved_docs?.length || 0,
          sampleDoc: q.retrieved_docs?.[0]?.doc_id
        }))
      });
      points = processDocumentsToChunks(questionResults, memoizedAllChunks || undefined);
    } else if (perspective === 'questions-to-chunks') {
      points = processQuestionsToChunks(questionResults);
    } else if (perspective === 'chunks-to-questions') {
      points = processChunksToQuestions(questionResults, memoizedAllChunks || undefined);
    } else if (perspective === 'roles-to-chunks') {
      points = processRolesToChunks(questionResults, memoizedAllChunks || undefined);
    } else {
      // Default to documents-to-chunks
      points = processDocumentsToChunks(questionResults, memoizedAllChunks || undefined);
    }
    
    // Filter by quality
    points = filterPointsByQuality(points, qualityFilter);
    
    return points;
  }, [questionResults, perspective, qualityFilter, memoizedAllChunks]);

  // Position points using coordinates from heatmap data processing
  const positionPoints = useMemo(() => {
    if (heatmapPoints.length === 0) return [];
    
    // Use actual inner dimensions for correct positioning
    const canvasWidth = innerWidth;
    const canvasHeight = innerHeight;
    
    return heatmapPoints.map((point, index) => {
      if (perspective === 'chunks-to-questions') {
        // For chunks-to-questions view, use the pre-calculated positioning (center/perimeter layout)
        const x = (point.x / 100) * (canvasWidth - 60) + 30;
        const y = (point.y / 100) * (canvasHeight - 60) + 30;
        
        const finalX = Math.max(20, Math.min(canvasWidth - 20, x));
        const finalY = Math.max(20, Math.min(canvasHeight - 20, y));
        
        return {
          ...point,
          screenX: finalX,
          screenY: finalY
        };
      } else if (perspective === 'roles-to-chunks') {
        // For roles view, use horizontal spacing with quality-based vertical positioning
        const spacing = Math.min(canvasWidth / (heatmapPoints.length + 1), 120);
        const x = spacing * (index + 1);
        const y = canvasHeight - (point.y * (canvasHeight - 60) / 100) - 30; // Invert Y for better visual
        
        return {
          ...point,
          screenX: Math.max(20, Math.min(canvasWidth - 20, x)),
          screenY: Math.max(20, Math.min(canvasHeight - 20, y))
        };
      } else if (perspective === 'documents-to-chunks' || perspective === 'questions-to-chunks') { // This will handle 'documents-to-chunks' and 'questions-to-chunks'
        // For questions view, use the original grid-based scatter approach
        const cols = Math.ceil(Math.sqrt(heatmapPoints.length));
        const rows = Math.ceil(heatmapPoints.length / cols);
        
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        // Use deterministic "randomness" based on point ID for consistent positioning
        const seed = point.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const pseudoRandX = ((seed * 9301 + 49297) % 233280) / 233280 - 0.5;
        const pseudoRandY = ((seed * 7927 + 12345) % 217728) / 217728 - 0.5;
        
        // Add deterministic jitter for more natural scatter
        const jitterX = pseudoRandX * 60;
        const jitterY = pseudoRandY * 60;
        
        const x = (col / Math.max(cols - 1, 1)) * (canvasWidth - 60) + 30 + jitterX;
        const y = (row / Math.max(rows - 1, 1)) * (canvasHeight - 60) + 30 + jitterY;
        
        return {
          ...point,
          screenX: Math.max(20, Math.min(canvasWidth - 20, x)),
          screenY: Math.max(20, Math.min(canvasHeight - 20, y))
        };
      }
      
      // Fallback for any unexpected perspective values
      return {
        ...point,
        screenX: 0,
        screenY: 0
      };
    });
  }, [heatmapPoints, perspective, innerWidth, innerHeight]);

  useEffect(() => {
    if (!showTooltips) {
      setTooltipData(null);
      setTooltipPosition({ x: 0, y: 0, visible: false });
    }
  }, [showTooltips]);

  // Stable render key to prevent unnecessary re-renders
  const renderKey = useMemo(() => {
    return `${positionPoints.length}-${perspective}-${qualityFilter}-${pointSize}`;
  }, [positionPoints.length, perspective, qualityFilter, pointSize]);

  // Draw the scatter plot (only when data actually changes)
  // Initialize SVG structure only once
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Always clear and recreate structure on perspective change or data change
    svg.selectAll('*').remove(); // Clear everything on every render to prevent artifacts
    
    // Also clear any document chunk groups that might be lingering
    svg.selectAll('[class^="document-chunks-"]').remove();
    
    console.log('🧹 Cleared all existing D3 elements and document chunks for perspective change');

    // Use actual inner dimensions for grid
    const gridWidth = innerWidth;
    const gridHeight = innerHeight;

    // Create main group with minimal margins (no axes needed)
    const g = svg.append('g')
      .attr('class', 'main-group')
      .attr('transform', `translate(${dimensions.margin.left},${dimensions.margin.top})`);

    // Add subtle background grid (optional, for visual reference)
    const gridSize = 50;
    const gridLines = g.append('g')
      .attr('class', 'background-grid')
      .style('opacity', 0.1);

    // Vertical grid lines
    for (let x = 0; x <= gridWidth; x += gridSize) {
      gridLines.append('line')
        .attr('x1', x).attr('y1', 0)
        .attr('x2', x).attr('y2', gridHeight)
        .style('stroke', '#ccc');
    }

    // Horizontal grid lines
    for (let y = 0; y <= gridHeight; y += gridSize) {
      gridLines.append('line')
        .attr('x1', 0).attr('y1', y)
        .attr('x2', gridWidth).attr('y2', y)
        .style('stroke', '#ccc');
    }

    // Create containers for different point types
    g.append('g').attr('class', 'unassociated-points');
    g.append('g').attr('class', 'associated-points');
  }, [dimensions.margin, innerWidth, innerHeight, perspective]); // Re-run if margins, dimensions or perspective changes

  // Update points using data binding (efficient updates)
  useEffect(() => {
    if (!svgRef.current || positionPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('.main-group');
    
    // Clear any existing hexagons and document chunks from previous perspective
    g.selectAll('.scatter-point').remove();
    g.selectAll('[class^="document-chunks-"]').remove();
    console.log('🧹 Cleared existing points and document chunks before rendering new perspective');

    // Helper function to generate hexagon coordinates
    const generateHexagon = (cx: number, cy: number, radius: number): string => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i; // 60 degrees apart
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    };

    // Separate points by type for sequential rendering
    const unassociatedPoints = positionPoints.filter(p => 
      p.data.type === 'unassociated-cluster' || (p.data.type === 'chunk' && p.data.isUnretrieved)
    );
    const associatedPoints = positionPoints.filter(p => 
      !(p.data.type === 'unassociated-cluster' || (p.data.type === 'chunk' && p.data.isUnretrieved))
    );
    
    console.log('🎯 ScatterHeatmap rendering:', {
      totalPoints: positionPoints.length,
      unassociatedCount: unassociatedPoints.length,
      associatedCount: associatedPoints.length,
      sampleAssociated: associatedPoints.slice(0, 5).map(p => ({
        id: p.id,
        type: p.data.type,
        x: p.screenX,
        y: p.screenY,
        size: p.size,
        color: p.color,
        opacity: p.opacity
      }))
    });

    // Helper function to generate small hexagon for chunks
    const generateChunkHexagon = (cx: number, cy: number, radius: number): string => {
      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i; // 60 degrees apart
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        points.push(`${x},${y}`);
      }
      return points.join(' ');
    };

    // Helper function to render chunks inside document hexagons
    const renderDocumentChunks = (documentPoint: HeatmapPoint, parentG: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      if (documentPoint.data.type !== 'document') return;
      
      const docData = documentPoint.data as import('../../utils/heatmapData').DocumentHeatmapData;
      const docRadius = getScaledSize(documentPoint.size, minSize, maxSize);
      const centerX = documentPoint.screenX || 0;
      const centerY = documentPoint.screenY || 0;
      
      // Create a group for this document's chunks
      const chunkGroup = parentG.append('g')
        .attr('class', `document-chunks-${documentPoint.id}`);
      
      // Calculate chunk positions - show proportional number of chunks
      const chunks = docData.chunks;
      const chunkCount = chunks.length;
      const maxChunksToShow = Math.min(chunkCount, Math.max(8, Math.floor(chunkCount * 0.6))); // Show 60% of chunks, min 8
      const chunkRadius = Math.max(8, docRadius * 0.12); // Much bigger chunks - 12% of document radius
      
      // Separate retrieved and unretrieved chunks for better organization
      const retrievedChunks = chunks.filter(chunk => !chunk.isUnretrieved).slice(0, Math.floor(maxChunksToShow * 0.7));
      const unretrievedChunks = chunks.filter(chunk => chunk.isUnretrieved).slice(0, maxChunksToShow - retrievedChunks.length);
      
      // Combine chunks with retrieved chunks first, then unretrieved chunks
      const organizedChunks = [...retrievedChunks, ...unretrievedChunks];
      
      organizedChunks.forEach((chunk, index) => {
        // Calculate safe spacing to prevent overlapping - increased spacing
        const chunkSpacing = chunkRadius * 3.0; // Increased minimum distance between chunk centers
        const availableRadius = docRadius * 0.65; // Reduced to 65% of document radius for chunk area to add more space
        
        // Calculate maximum chunks per ring based on circumference and chunk spacing
        const getMaxChunksForRadius = (radius: number) => {
          if (radius <= 0) return 1; // Center position
          const circumference = 2 * Math.PI * radius;
          return Math.max(1, Math.floor(circumference / chunkSpacing));
        };
        
        // Place chunks in rings, starting from center
        let chunkX: number = centerX;
        let chunkY: number = centerY;
        let remainingChunks = index + 1; // Current chunk position (1-based)
        let currentRadius = 0;
        let ringIndex = 0;
        
        // Find which ring this chunk belongs to
        while (remainingChunks > 0) {
          const maxChunksInRing = getMaxChunksForRadius(currentRadius);
          if (remainingChunks <= maxChunksInRing) {
            // This chunk goes in the current ring
            if (currentRadius === 0) {
              // Center position
              chunkX = centerX;
              chunkY = centerY;
            } else {
              // Calculate angle for this chunk in the ring
              const angleStep = (2 * Math.PI) / maxChunksInRing;
              const angle = (remainingChunks - 1) * angleStep;
              chunkX = centerX + currentRadius * Math.cos(angle);
              chunkY = centerY + currentRadius * Math.sin(angle);
            }
            break;
          } else {
            // Move to next ring
            remainingChunks -= maxChunksInRing;
            ringIndex++;
            currentRadius = Math.min(availableRadius, (ringIndex * chunkSpacing * 0.8));
          }
        }
        
        // Color coding: green for retrieved chunks, gray for unassociated
        const chunkColor = chunk.isUnretrieved ? '#9e9e9e' : getHeatmapColor(chunk.avgSimilarity, false, true);
        const chunkOpacity = chunk.isUnretrieved ? 0.6 : 0.9;
        
        // Create hexagonal chunk instead of circle
        const chunkHexagon = chunkGroup.append('polygon')
          .attr('points', generateChunkHexagon(chunkX, chunkY, chunkRadius))
          .attr('fill', chunkColor)
          .attr('opacity', chunkOpacity)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2) // Thicker stroke for better visibility
          .attr('class', 'chunk-hexagon')
          .style('cursor', 'pointer')
          .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'); // Add shadow for depth
          
        // Add tooltip and click interaction for chunks
        chunkHexagon
          .on('mouseover', function(event, d) {
            // Add hover effect - make chunk bigger and brighter
            d3.select(this)
              .transition()
              .duration(150)
              .attr('points', generateChunkHexagon(chunkX, chunkY, chunkRadius * 1.2))
              .attr('stroke-width', 3)
              .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))');
            
            // Show tooltip for chunk
            console.log('🔍 Chunk mouseover triggered', chunk.chunkId);
            if (showTooltips) {
              console.log('✅ Setting chunk tooltip data');
              setTooltipData({
                id: `chunk_${chunk.chunkId}`,
                x: chunkX,
                y: chunkY,
                size: chunkRadius * 2,
                color: chunk.avgSimilarity,
                opacity: chunkOpacity,
                screenX: chunkX,
                screenY: chunkY,
                data: {
                  type: 'chunk' as const,
                  chunkId: chunk.chunkId,
                  docId: docData.docId,
                  title: docData.title,
                  content: chunk.content,
                  retrievalFrequency: chunk.retrievalFrequency,
                  avgSimilarity: chunk.avgSimilarity,
                  bestQuestion: chunk.bestRetrievingQuestion,
                  retrievingQuestions: [],
                  isUnretrieved: chunk.isUnretrieved
                }
              } as HeatmapPoint);
              
              // Use SVG-relative coordinates for tooltip positioning (same as main hexagons)
              const rect = svgRef.current!.getBoundingClientRect();
              const tooltipX = event.clientX - rect.left;
              const tooltipY = event.clientY - rect.top;
              
              console.log('🔍 Chunk tooltip position:', {
                clientX: event.clientX,
                clientY: event.clientY,
                svgRelativeX: tooltipX,
                svgRelativeY: tooltipY,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight,
                chunkId: chunk.chunkId
              });
              
              setTooltipPosition({
                x: tooltipX,
                y: tooltipY,
                visible: true
              });
            }
          })
          .on('mouseout', function() {
            // Reset hover effect
            d3.select(this)
              .transition()
              .duration(150)
              .attr('points', generateChunkHexagon(chunkX, chunkY, chunkRadius))
              .attr('stroke-width', 2)
              .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))');
              
            setTooltipData(null);
            setTooltipPosition(prev => ({ ...prev, visible: false }));
          })
          .on('click', function(event, d) {
            event.stopPropagation(); // Prevent document hexagon click
            if (onPointClick) {
              onPointClick({
                id: `chunk_${chunk.chunkId}`,
                x: chunkX,
                y: chunkY,
                size: chunkRadius * 2,
                color: chunk.avgSimilarity,
                opacity: chunkOpacity,
                screenX: chunkX,
                screenY: chunkY,
                data: {
                  type: 'chunk' as const,
                  chunkId: chunk.chunkId,
                  docId: docData.docId,
                  title: docData.title,
                  content: chunk.content,
                  retrievalFrequency: chunk.retrievalFrequency,
                  avgSimilarity: chunk.avgSimilarity,
                  bestQuestion: chunk.bestRetrievingQuestion,
                  retrievingQuestions: [],
                  isUnretrieved: chunk.isUnretrieved
                }
              } as HeatmapPoint);
            }
          });
      });
      
      // Add a text indicator showing total chunk count for clarity
      chunkGroup.append('text')
        .attr('x', centerX)
        .attr('y', centerY + docRadius * 0.85)
        .attr('text-anchor', 'middle')
        .attr('font-size', Math.max(10, docRadius * 0.12)) // Larger font for larger hexagons
        .attr('fill', '#444')
        .attr('font-weight', 'bold')
        .text(chunks.length > maxChunksToShow ? `${maxChunksToShow} of ${chunks.length} chunks` : `${chunks.length} chunks`);
      
      // Add document title in the center
      chunkGroup.append('text')
        .attr('x', centerX)
        .attr('y', centerY - docRadius * 0.2)
        .attr('text-anchor', 'middle')
        .attr('font-size', Math.max(8, docRadius * 0.08))
        .attr('fill', '#333')
        .attr('font-weight', 'bold')
        .text(docData.title.length > 15 ? `${docData.title.substring(0, 15)}...` : docData.title);
    };

    // Helper function to render chunks inside role hexagons (same as documents)
    const renderRoleChunks = (rolePoint: HeatmapPoint, parentG: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      if (rolePoint.data.type !== 'role') return;
      
      const roleData = rolePoint.data as import('../../utils/heatmapData').RoleHeatmapData;
      const roleRadius = getScaledSize(rolePoint.size, minSize, maxSize);
      const centerX = rolePoint.screenX || 0;
      const centerY = rolePoint.screenY || 0;
      
      // Create a group for this role's chunks
      const chunkGroup = parentG.append('g')
        .attr('class', `role-chunks-${roleData.roleId}`)
        .style('pointer-events', 'all');
      
      // Calculate chunk positions - show proportional number of chunks
      const chunks = roleData.chunks;
      const chunkCount = chunks.length;
      const maxChunksToShow = Math.min(chunkCount, Math.max(8, Math.floor(chunkCount * 0.6))); // Show 60% of chunks, min 8
      const chunkRadius = Math.max(8, roleRadius * 0.12); // Much bigger chunks - 12% of role radius
      
      // Calculate chunk spacing to prevent overlapping - increased spacing
      const chunkSpacing = chunkRadius * 3.0; // Increased minimum distance between chunk centers
      const availableRadius = roleRadius * 0.65; // Reduced to 65% of role radius for chunk area to add more space
      
      // Calculate maximum chunks per ring based on circumference and chunk spacing
      const getMaxChunksForRadius = (radius: number) => {
        if (radius <= 0) return 1; // Center position
        const circumference = 2 * Math.PI * radius;
        return Math.max(1, Math.floor(circumference / chunkSpacing));
      };
      
      chunks.slice(0, maxChunksToShow).forEach((chunk, index) => {
        // Place chunks in rings, starting from center
        let chunkX: number = centerX;
        let chunkY: number = centerY;
        let remainingChunks = index + 1; // Current chunk position (1-based)
        let currentRadius = 0;
        let ringIndex = 0;
        
        // Find which ring this chunk belongs to
        while (remainingChunks > 0) {
          const maxChunksInRing = getMaxChunksForRadius(currentRadius);
          if (remainingChunks <= maxChunksInRing) {
            // This chunk goes in the current ring
            if (currentRadius === 0) {
              // Center position
              chunkX = centerX;
              chunkY = centerY;
            } else {
              // Calculate angle for this chunk in the ring
              const angleStep = (2 * Math.PI) / maxChunksInRing;
              const angle = (remainingChunks - 1) * angleStep;
              chunkX = centerX + currentRadius * Math.cos(angle);
              chunkY = centerY + currentRadius * Math.sin(angle);
            }
            break;
          } else {
            // Move to next ring
            remainingChunks -= maxChunksInRing;
            ringIndex++;
            currentRadius = Math.min(availableRadius, (ringIndex * chunkSpacing * 0.8));
          }
        }
        
        // Color coding: green for retrieved chunks, gray for unassociated
        const chunkColor = chunk.isUnretrieved ? '#9e9e9e' : getHeatmapColor(chunk.avgSimilarity, false, true);
        const chunkOpacity = chunk.isUnretrieved ? 0.6 : 0.9;
        
        // Create hexagonal chunk instead of circle
        const chunkHexagon = chunkGroup.append('polygon')
          .attr('points', generateChunkHexagon(chunkX, chunkY, chunkRadius))
          .attr('fill', chunkColor)
          .attr('opacity', chunkOpacity)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2) // Thicker stroke for better visibility
          .attr('class', 'chunk-hexagon')
          .style('cursor', 'pointer')
          .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))'); // Add shadow for depth
          
        // Add tooltip and click interaction for chunks
        chunkHexagon
          .on('mouseover', function(event, d) {
            // Add hover effect - make chunk bigger and brighter
            d3.select(this)
              .transition()
              .duration(150)
              .attr('points', generateChunkHexagon(chunkX, chunkY, chunkRadius * 1.2))
              .attr('stroke-width', 3)
              .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.5))');
            
            // Show tooltip for chunk
            console.log('🔍 Chunk mouseover triggered', chunk.chunkId);
            if (showTooltips) {
              console.log('✅ Setting chunk tooltip data');
              setTooltipData({
                id: `chunk_${chunk.chunkId}`,
                x: chunkX,
                y: chunkY,
                size: chunkRadius * 2,
                color: chunk.avgSimilarity,
                opacity: chunkOpacity,
                screenX: chunkX,
                screenY: chunkY,
                data: {
                  type: 'chunk',
                  chunkId: chunk.chunkId,
                  content: chunk.content,
                  docId: chunk.docId,
                  title: chunk.title,
                  retrievalFrequency: chunk.retrievalFrequency,
                  avgSimilarity: chunk.avgSimilarity,
                  isUnretrieved: chunk.isUnretrieved,
                  bestQuestion: chunk.bestRetrievingQuestion ? {
                    questionId: chunk.bestRetrievingQuestion.questionId,
                    questionText: chunk.bestRetrievingQuestion.questionText,
                    similarity: chunk.bestRetrievingQuestion.similarity,
                    roleName: chunk.bestRetrievingQuestion.source
                  } : {
                    questionId: 'unknown',
                    questionText: 'No retrieving question',
                    similarity: 0,
                    roleName: 'Unknown'
                  },
                  retrievingQuestions: chunk.bestRetrievingQuestion ? [{
                    questionId: chunk.bestRetrievingQuestion.questionId,
                    questionText: chunk.bestRetrievingQuestion.questionText,
                    source: chunk.bestRetrievingQuestion.source,
                    similarity: chunk.bestRetrievingQuestion.similarity,
                    roleName: chunk.bestRetrievingQuestion.source
                  }] : []
                }
              });
              // Use SVG-relative coordinates for tooltip positioning (same as main hexagons)
              const rect = svgRef.current!.getBoundingClientRect();
              setTooltipPosition({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                visible: true
              });
            }
          })
          .on('mouseout', function() {
            // Reset hover effect
            d3.select(this)
              .transition()
              .duration(150)
              .attr('points', generateChunkHexagon(chunkX, chunkY, chunkRadius))
              .attr('stroke-width', 2)
              .style('filter', 'drop-shadow(1px 1px 2px rgba(0,0,0,0.3))');
              
            setTooltipData(null);
            setTooltipPosition(prev => ({ ...prev, visible: false }));
          })
          .on('click', function(event, d) {
            event.stopPropagation(); // Prevent role hexagon click
            if (onPointClick) {
              onPointClick({
                id: `chunk_${chunk.chunkId}`,
                x: chunkX,
                y: chunkY,
                size: chunkRadius * 2,
                color: chunk.avgSimilarity,
                opacity: chunkOpacity,
                screenX: chunkX,
                screenY: chunkY,
                data: {
                  type: 'chunk',
                  chunkId: chunk.chunkId,
                  content: chunk.content,
                  docId: chunk.docId,
                  title: chunk.title,
                  retrievalFrequency: chunk.retrievalFrequency,
                  avgSimilarity: chunk.avgSimilarity,
                  isUnretrieved: chunk.isUnretrieved,
                  bestQuestion: chunk.bestRetrievingQuestion ? {
                    questionId: chunk.bestRetrievingQuestion.questionId,
                    questionText: chunk.bestRetrievingQuestion.questionText,
                    similarity: chunk.bestRetrievingQuestion.similarity,
                    roleName: chunk.bestRetrievingQuestion.source
                  } : {
                    questionId: 'unknown',
                    questionText: 'No retrieving question',
                    similarity: 0,
                    roleName: 'Unknown'
                  },
                  retrievingQuestions: chunk.bestRetrievingQuestion ? [{
                    questionId: chunk.bestRetrievingQuestion.questionId,
                    questionText: chunk.bestRetrievingQuestion.questionText,
                    source: chunk.bestRetrievingQuestion.source,
                    similarity: chunk.bestRetrievingQuestion.similarity,
                    roleName: chunk.bestRetrievingQuestion.source
                  }] : []
                }
              });
            }
          });
      });
      
      // Add a text indicator showing total chunk count for clarity
      chunkGroup.append('text')
        .attr('x', centerX)
        .attr('y', centerY + roleRadius * 0.85)
        .attr('text-anchor', 'middle')
        .attr('font-size', Math.max(10, roleRadius * 0.12)) // Larger font for larger hexagons
        .attr('fill', '#444')
        .attr('font-weight', 'bold')
        .text(chunks.length > maxChunksToShow ? `${maxChunksToShow} of ${chunks.length} chunks` : `${chunks.length} chunks`);
      
      // Add role title in the center
      chunkGroup.append('text')
        .attr('x', centerX)
        .attr('y', centerY - roleRadius * 0.2)
        .attr('text-anchor', 'middle')
        .attr('font-size', Math.max(8, roleRadius * 0.08))
        .attr('fill', '#333')
        .attr('font-weight', 'bold')
        .text(roleData.roleName.length > 15 ? `${roleData.roleName.substring(0, 15)}...` : roleData.roleName);
    };

    // Helper function to update points with efficient data binding
    const updatePointGroup = (container: string, points: HeatmapPoint[], isUnassociated: boolean) => {
      const selection = g.select(container)
        .selectAll<SVGPolygonElement, HeatmapPoint>('.scatter-point')
        .data(points, (d: HeatmapPoint) => `${d.id || d.screenX}-${d.screenY}`); // Key function for stable updates

      // Remove old points
      selection.exit()
        .transition()
        .duration(200)
        .attr('opacity', 0)
        .remove();

      // Add new points
      const enter = selection.enter()
        .append('polygon')
        .attr('class', 'scatter-point')
        .attr('opacity', 0)
        .style('cursor', 'pointer');

      // Update both new and existing points
      const merged = selection.merge(enter);
      
      merged
        .transition()
        .duration(300)
        .attr('points', d => {
          const points = generateHexagon(d.screenX || 0, d.screenY || 0, getScaledSize(d.size, minSize, maxSize));
          if (Math.random() < 0.1) { // Log 10% of hexagons for debugging
            console.log('🔸 Creating hexagon:', {
              id: d.id,
              x: d.screenX,
              y: d.screenY,
              size: d.size,
              scaledSize: getScaledSize(d.size, minSize, maxSize),
              color: d.color,
              opacity: d.opacity,
              points: points.substring(0, 20) + '...'
            });
          }
          return points;
        })
        .attr('fill', d => {
          const color = getHeatmapColor(d.color, isUnassociated, true);
          if (Math.random() < 0.1) { // Log 10% for debugging
            console.log('🎨 Color calculation:', {
              inputColor: d.color,
              isUnassociated,
              resultColor: color
            });
          }
          return color;
        })
        .attr('opacity', d => d.opacity)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      return merged;
    };

    // Phase 1: Update unassociated chunks (background layer)
    const unassociatedHexagons = updatePointGroup('.unassociated-points', unassociatedPoints, true);

    // Phase 2: Update associated chunks (foreground layer)  
    const associatedHexagons = updatePointGroup('.associated-points', associatedPoints, false);

    // Combine both groups for event handling
    const allHexagons = g.selectAll('.scatter-point');

    // Add event listeners that only modify styles, not the entire DOM
    allHexagons
      .on('mouseover', function(event, d) {
        if (!showTooltips) return;
        const heatmapPoint = d as HeatmapPoint;
        // Hide any existing tooltip first
        setTooltipPosition(prev => ({ ...prev, visible: false }));
        setTooltipData(null);
        
        // Only modify the specific hexagon's styles
        const currentRadius = getScaledSize(heatmapPoint.size, minSize, maxSize);
        d3.select(this)
          .attr('stroke-width', 3)
          .attr('stroke', '#333')
          .attr('points', generateHexagon(heatmapPoint.screenX || 0, heatmapPoint.screenY || 0, currentRadius + 2));
        
        // Show tooltip without triggering re-render
        const rect = svgRef.current!.getBoundingClientRect();
        const newPosition = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          visible: true
        };
        
        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
          setTooltipPosition(newPosition);
          setTooltipData(prev => {
            if (prev?.id !== (d as HeatmapPoint).id) {
              return d as HeatmapPoint;
            }
            return prev;
          });
        });
      })
      .on('mouseout', function(_, d) {
        if (!showTooltips) return;
        const heatmapPoint = d as HeatmapPoint;
        // Only modify the specific hexagon's styles
        const currentRadius = getScaledSize(heatmapPoint.size, minSize, maxSize);
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('stroke', '#fff')
          .attr('points', generateHexagon(heatmapPoint.screenX || 0, heatmapPoint.screenY || 0, currentRadius));
      })
      .on('click', function(_, d) {
        const heatmapPoint = d as HeatmapPoint;
        // Hide tooltip on click
        setTooltipPosition(prev => ({ ...prev, visible: false }));
        setTooltipData(null);
        
        if (onPointClick) {
          onPointClick(heatmapPoint);
        }
      });

    // Add entrance animation - unassociated chunks first, then associated chunks
    // Phase 1 animation: Unassociated chunks (background layer)
    unassociatedHexagons
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, 0))
      .transition()
      .duration(600)
      .delay((_, i) => i * 20) // Faster animation for background
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, getScaledSize(d.size, minSize, maxSize)));

    // Phase 2 animation: Associated chunks (foreground layer) - start after unassociated
    associatedHexagons
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, 0))
      .transition()
      .duration(800)
      .delay((_, i) => (unassociatedPoints.length * 20) + (i * 40)) // Start after unassociated animation
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, getScaledSize(d.size, minSize, maxSize)));

    // Render document chunks immediately for documents-to-chunks perspective
    if (perspective === 'documents-to-chunks') {
      positionPoints
        .filter(p => p.data.type === 'document')
        .forEach(docPoint => {
          renderDocumentChunks(docPoint, g as any); // Cast to resolve TypeScript issue
        });
    }

    // Render role chunks immediately for roles-to-chunks perspective
    if (perspective === 'roles-to-chunks') {
      positionPoints
        .filter(p => p.data.type === 'role')
        .forEach(rolePoint => {
          renderRoleChunks(rolePoint, g as any); // Cast to resolve TypeScript issue
        });
    }

  }, [renderKey, positionPoints, dimensions, onPointClick, perspective, minSize, maxSize, showTooltips]);

  // Separate effect for click handler updates (doesn't trigger full redraw)
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('.scatter-point')
      .on('click', function(event, d) {
        // Hide tooltip on click
        setTooltipPosition(prev => ({ ...prev, visible: false }));
        setTooltipData(null);
        
        if (onPointClick) {
          onPointClick(d as HeatmapPoint);
        }
      });
  }, [onPointClick]);

  if (questionResults.length === 0) {
    return (
      <div style={{ 
        width: '100%', 
        height: '200px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666',
        fontSize: '16px'
      }}>
        No data available for heatmap visualization
      </div>
    );
  }

  return (
    <div className="heatmap-container" style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ 
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          backgroundColor: '#fafafa'
        }}
      />
      
      {tooltipData && (
        <HeatmapTooltip
          point={tooltipData}
          position={tooltipPosition}
          perspective={perspective}
          onDismiss={() => {
            setTooltipPosition(prev => ({ ...prev, visible: false }));
            setTooltipData(null);
          }}
        />
      )}
      
      <div style={{ 
        marginTop: '10px', 
        fontSize: '12px', 
        color: '#666',
        textAlign: 'center'
      }}>
        {perspective === 'questions-to-chunks' 
          ? `${heatmapPoints.length} questions shown`
          : `${totalChunks || heatmapPoints.length} chunks shown`}
        {qualityFilter !== 'all' && ` (${qualityFilter} quality only)`}
      </div>
    </div>
  );
});

ScatterHeatmap.displayName = 'ScatterHeatmap';

export default ScatterHeatmap;