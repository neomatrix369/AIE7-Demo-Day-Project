import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { QuestionResult, HeatmapPerspective, HeatmapDimensions, TooltipPosition } from '../../types';
import { 
  HeatmapPoint, 
  processQuestionsToChunks, 
  processChunksToQuestions, 
  processRolesToChunks,
  processChunksToRoles,
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
}

const ScatterHeatmap: React.FC<ScatterHeatmapProps> = React.memo(({
  questionResults,
  perspective,
  qualityFilter,
  onPointClick,
  width = 800,
  height = 400,
  allChunks,
  totalChunks
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltipData, setTooltipData] = useState<HeatmapPoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({
    x: 0,
    y: 0,
    visible: false
  });
  

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
    
    if (perspective === 'questions-to-chunks') {
      points = processQuestionsToChunks(questionResults);
    } else if (perspective === 'chunks-to-questions') {
      points = processChunksToQuestions(questionResults, memoizedAllChunks || undefined);
    } else if (perspective === 'roles-to-chunks') {
      points = processRolesToChunks(questionResults);
    } else {
      points = processChunksToRoles(questionResults, memoizedAllChunks || undefined);
    }
    
    // Filter by quality
    points = filterPointsByQuality(points, qualityFilter);
    
    return points;
  }, [questionResults, perspective, qualityFilter, memoizedAllChunks]);

  // Position points using coordinates from heatmap data processing
  const positionPoints = useMemo(() => {
    if (heatmapPoints.length === 0) return [];
    
    // Use fixed canvas size for consistent positioning
    const canvasWidth = 700;
    const canvasHeight = 320;
    
    return heatmapPoints.map((point, index) => {
      if (perspective === 'chunks-to-questions' || perspective === 'chunks-to-roles') {
        // For chunks views, use the pre-calculated positioning (center/perimeter layout)
        // Convert from 0-100 coordinate system to canvas pixels
        const x = (point.x / 100) * (canvasWidth - 60) + 30;
        const y = (point.y / 100) * (canvasHeight - 60) + 30;
        
        return {
          ...point,
          screenX: Math.max(20, Math.min(canvasWidth - 20, x)),
          screenY: Math.max(20, Math.min(canvasHeight - 20, y))
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
      } else {
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
    });
  }, [heatmapPoints, perspective]);

  // Stable render key to prevent unnecessary re-renders
  const renderKey = useMemo(() => {
    return `${positionPoints.length}-${perspective}-${qualityFilter}`;
  }, [positionPoints.length, perspective, qualityFilter]);

  // Draw the scatter plot (only when data actually changes)
  // Initialize SVG structure only once
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    
    // Only clear and recreate structure if it doesn't exist
    if (svg.select('.main-group').empty()) {
      svg.selectAll('*').remove(); // Clear everything on first render only

      // Use fixed dimensions for grid
      const gridWidth = 700;
      const gridHeight = 320;

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
    }
  }, [dimensions.margin]); // Only re-run if margins change

  // Update points using data binding (efficient updates)
  useEffect(() => {
    if (!svgRef.current || positionPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select('.main-group');

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
        .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, getScaledSize(d.size, 6, 20)))
        .attr('fill', d => getHeatmapColor(d.color, isUnassociated, true))
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
        const heatmapPoint = d as HeatmapPoint;
        // Hide any existing tooltip first
        setTooltipPosition(prev => ({ ...prev, visible: false }));
        setTooltipData(null);
        
        // Only modify the specific hexagon's styles
        const currentRadius = getScaledSize(heatmapPoint.size, 6, 20);
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
          if (tooltipData?.id !== (d as HeatmapPoint).id) { // Only update data if different point
            setTooltipData(d as HeatmapPoint);
          }
        });
      })
      .on('mouseout', function(_, d) {
        const heatmapPoint = d as HeatmapPoint;
        // Only modify the specific hexagon's styles
        const currentRadius = getScaledSize(heatmapPoint.size, 6, 20);
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
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, getScaledSize(d.size, 6, 20)));

    // Phase 2 animation: Associated chunks (foreground layer) - start after unassociated
    associatedHexagons
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, 0))
      .transition()
      .duration(800)
      .delay((_, i) => (unassociatedPoints.length * 20) + (i * 40)) // Start after unassociated animation
      .attr('points', d => generateHexagon(d.screenX || 0, d.screenY || 0, getScaledSize(d.size, 6, 20)));

  }, [renderKey, positionPoints, dimensions, onPointClick]);

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
    <div style={{ position: 'relative', width: '100%' }}>
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