import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { QuestionResult, HeatmapPerspective, HeatmapDimensions, TooltipPosition } from '../../types';
import { 
  HeatmapPoint, 
  getHeatmapColor, 
  getScaledSize, 
  optimizePositions,
  filterPointsByQuality 
} from '../../utils/heatmapData';
import { 
  processDocumentsToChunksRefactored,
  processQuestionsToChunksRefactored,
  processChunksToQuestionsRefactored,
  processRolesToChunksRefactored
} from '../../utils/heatmapProcessors';
import HeatmapTooltip from './HeatmapTooltip';
import { renderOwnerChunks, generateHexagonPoints } from './renderUtils';
import { computeGridPositions } from './positionUtils';

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
      points = processDocumentsToChunksRefactored(questionResults, memoizedAllChunks || undefined);
    } else if (perspective === 'questions-to-chunks') {
      points = processQuestionsToChunksRefactored(questionResults, memoizedAllChunks || undefined);
    } else if (perspective === 'chunks-to-questions') {
      points = processChunksToQuestionsRefactored(questionResults, memoizedAllChunks || undefined);
    } else if (perspective === 'roles-to-chunks') {
      points = processRolesToChunksRefactored(questionResults, memoizedAllChunks || undefined);
    } else {
      // Default to documents-to-chunks
      points = processDocumentsToChunksRefactored(questionResults, memoizedAllChunks || undefined);
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
    
    // Use shared grid positioning for grid-like perspectives
    const gridify = (pts: HeatmapPoint[]) =>
      computeGridPositions(pts, canvasWidth, canvasHeight, { margin: 30, jitter: 60 });

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
        // Delegate to shared grid positioning
        const gridPoints = gridify(heatmapPoints);
        return gridPoints[index];
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

    // Use shared hexagon generator
    const generateHexagon = generateHexagonPoints;

    // Separate points by type for sequential rendering
    const unretrievedPoints = positionPoints.filter(p => 
      p.data.type === 'unassociated-cluster' || (p.data.type === 'chunk' && p.data.isUnretrieved)
    );
    const retrievedPoints = positionPoints.filter(p => 
      !(p.data.type === 'unassociated-cluster' || (p.data.type === 'chunk' && p.data.isUnretrieved))
    );
    
    console.log('🎯 ScatterHeatmap rendering:', {
      totalPoints: positionPoints.length,
      unretrievedCount: unretrievedPoints.length,
      retrievedCount: retrievedPoints.length,
      sampleRetrieved: retrievedPoints.slice(0, 5).map(p => ({
        id: p.id,
        type: p.data.type,
        x: p.screenX,
        y: p.screenY,
        size: p.size,
        color: p.color,
        opacity: p.opacity
      }))
    });

    const generateChunkHexagon = generateHexagonPoints;

    // Unified owner (document/role) chunk rendering
    const renderDocumentChunks = (documentPoint: HeatmapPoint, parentG: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      renderOwnerChunks(documentPoint, parentG, {
        showTooltips,
        svgRef,
        getScaledSize,
        getHeatmapColor,
        minSize,
        maxSize,
        setTooltipData,
        setTooltipPosition,
        onPointClick
      });
    };

    // Helper function to render chunks inside role hexagons (same as documents)
    const renderRoleChunks = (rolePoint: HeatmapPoint, parentG: d3.Selection<SVGGElement, unknown, null, undefined>) => {
      renderOwnerChunks(rolePoint, parentG, {
        showTooltips,
        svgRef,
        getScaledSize,
        getHeatmapColor,
        minSize,
        maxSize,
        setTooltipData,
        setTooltipPosition,
        onPointClick
      });
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

    // Phase 1: Update unretrieved chunks (background layer)
    const unretrievedHexagons = updatePointGroup('.unassociated-points', unretrievedPoints, true);

    // Phase 2: Update retrieved chunks (foreground layer)  
    const retrievedHexagons = updatePointGroup('.associated-points', retrievedPoints, false);

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

    // Add entrance animation - unretrieved chunks first, then retrieved chunks
    // Phase 1 animation: Unretrieved chunks (background layer)
    unretrievedHexagons
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, 0))
      .transition()
      .duration(600)
      .delay((_, i) => i * 20) // Faster animation for background
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, getScaledSize(d.size, minSize, maxSize)));

    // Phase 2 animation: Retrieved chunks (foreground layer) - start after unretrieved
    retrievedHexagons
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, 0))
      .transition()
      .duration(800)
      .delay((_, i) => (unretrievedPoints.length * 20) + (i * 40)) // Start after unretrieved animation
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