import * as d3 from 'd3';
import { HeatmapPoint, DocumentHeatmapData, RoleHeatmapData } from '../../utils/heatmapData';
import {
  CHUNK_MAX_COVERAGE_RATIO,
  CHUNK_SPACING_MULTIPLIER,
  COLOR_UNRETRIEVED,
  HEX_STROKE_WIDTH,
  HEX_STROKE_WIDTH_HOVER,
  OPACITY_RETRIEVED,
  OPACITY_UNRETRIEVED,
  SHADOW_DEFAULT,
  SHADOW_HOVER
} from './heatmapTheme';

export const generateHexagonPoints = (cx: number, cy: number, radius: number): string => {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i; // 60 degrees apart
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(' ');
};

export interface ChunkLayoutOptions<TChunk> {
  centerX: number;
  centerY: number;
  ownerRadius: number;
  chunkRadius: number;
  spacingMultiplier?: number; // default 3.0
  maxCoverageRatio?: number; // default 0.65
  chunks: TChunk[];
  maxToShow?: number; // optional cap
  isUnretrieved: (c: TChunk) => boolean;
}

export interface PositionedChunk<TChunk> {
  x: number;
  y: number;
  chunk: TChunk;
}

export function layoutChunksInRings<TChunk>(opts: ChunkLayoutOptions<TChunk>): PositionedChunk<TChunk>[] {
  const {
    centerX,
    centerY,
    ownerRadius,
    chunkRadius,
    chunks,
    spacingMultiplier = CHUNK_SPACING_MULTIPLIER,
    maxCoverageRatio = CHUNK_MAX_COVERAGE_RATIO,
    maxToShow
  } = opts;

  // retrieved first, then unretrieved
  const retrieved = chunks.filter(c => !opts.isUnretrieved(c));
  const unretrieved = chunks.filter(c => opts.isUnretrieved(c));
  const limitedRetrieved = typeof maxToShow === 'number' ? retrieved.slice(0, Math.floor(maxToShow * 0.7)) : retrieved;
  const remainingSlots = typeof maxToShow === 'number' ? Math.max(maxToShow - limitedRetrieved.length, 0) : undefined;
  const limitedUnretrieved = typeof remainingSlots === 'number' ? unretrieved.slice(0, remainingSlots) : unretrieved;
  const ordered = [...limitedRetrieved, ...limitedUnretrieved];

  const chunkSpacing = chunkRadius * spacingMultiplier;
  const availableRadius = ownerRadius * maxCoverageRatio;

  const positioned: PositionedChunk<TChunk>[] = [];

  // helper to get capacity per ring
  const getMaxChunksForRadius = (radius: number) => {
    if (radius <= 0) return 1;
    const circumference = 2 * Math.PI * radius;
    return Math.max(1, Math.floor(circumference / chunkSpacing));
  };

  ordered.forEach((chunk, index) => {
    let chunkX: number = centerX;
    let chunkY: number = centerY;
    let remainingChunks = index + 1; // position index (1-based)
    let currentRadius = 0;
    let ringIndex = 0;

    while (remainingChunks > 0) {
      const maxInRing = getMaxChunksForRadius(currentRadius);
      if (remainingChunks <= maxInRing) {
        if (currentRadius === 0) {
          chunkX = centerX;
          chunkY = centerY;
        } else {
          const angleStep = (2 * Math.PI) / maxInRing;
          const angle = (remainingChunks - 1) * angleStep;
          chunkX = centerX + currentRadius * Math.cos(angle);
          chunkY = centerY + currentRadius * Math.sin(angle);
        }
        break;
      } else {
        remainingChunks -= maxInRing;
        ringIndex++;
        currentRadius = Math.min(availableRadius, (ringIndex * chunkSpacing * 0.8));
      }
    }

    positioned.push({ x: chunkX, y: chunkY, chunk });
  });

  return positioned;
}

export interface RenderContext {
  showTooltips: boolean;
  svgRef: React.RefObject<SVGSVGElement>;
  getScaledSize: (size: number, minSize: number, maxSize: number) => number;
  getHeatmapColor: (value: number, isUnassociated: boolean, hexagon: boolean) => string;
  minSize: number;
  maxSize: number;
  setTooltipData: (p: HeatmapPoint | null) => void;
  setTooltipPosition: (pos: { x: number; y: number; visible: boolean }) => void;
  onPointClick?: (p: HeatmapPoint) => void;
}

type OwnerData = DocumentHeatmapData | RoleHeatmapData;

export function renderOwnerChunks(
  ownerPoint: HeatmapPoint,
  parentG: d3.Selection<SVGGElement, unknown, null, undefined>,
  ctx: RenderContext
): void {
  if (ownerPoint.data.type !== 'document' && ownerPoint.data.type !== 'role') return;

  const ownerData = ownerPoint.data as OwnerData;
  const ownerRadius = ctx.getScaledSize(ownerPoint.size, ctx.minSize, ctx.maxSize);
  const centerX = ownerPoint.screenX || 0;
  const centerY = ownerPoint.screenY || 0;

  const chunkRadius = Math.max(8, ownerRadius * 0.12);
  const maxChunksToShow = Math.min(ownerData.chunks.length, Math.max(8, Math.floor(ownerData.chunks.length * 0.6)));

  const positioned = layoutChunksInRings({
    centerX,
    centerY,
    ownerRadius,
    chunkRadius,
    spacingMultiplier: 3.0,
    maxCoverageRatio: 0.65,
    // Normalize to a shape that always includes docId/title to satisfy types
    chunks: ownerData.chunks.map((c: any) => ({
      chunkId: c.chunkId,
      content: c.content,
      docId: c.docId ?? (ownerPoint.data.type === 'document' ? (ownerData as DocumentHeatmapData).docId : c.docId),
      title: c.title ?? (ownerPoint.data.type === 'document' ? (ownerData as DocumentHeatmapData).title : c.title),
      retrievalFrequency: c.retrievalFrequency ?? 0,
      avgSimilarity: c.avgSimilarity ?? 0,
      isUnretrieved: c.isUnretrieved === true,
      bestRetrievingQuestion: c.bestRetrievingQuestion
    })),
    maxToShow: maxChunksToShow,
    isUnretrieved: (c) => (c as any).isUnretrieved === true
  });

  const groupClass = ownerPoint.data.type === 'document' ? `document-chunks-${ownerPoint.id}` : `role-chunks-${(ownerData as RoleHeatmapData).roleId}`;
  const chunkGroup = parentG.append('g').attr('class', groupClass).style('pointer-events', 'all');

  positioned.forEach(({ x, y, chunk }) => {
    const ch: any = chunk as any;
    const avgSimilarity = ch.avgSimilarity as number;
    const isUnretrieved = ch.isUnretrieved as boolean;
    const color = isUnretrieved ? COLOR_UNRETRIEVED : ctx.getHeatmapColor(avgSimilarity, false, true);
    const opacity = isUnretrieved ? OPACITY_UNRETRIEVED : OPACITY_RETRIEVED;

    const polygon = chunkGroup
      .append('polygon')
      .attr('points', generateHexagonPoints(x, y, chunkRadius))
      .attr('fill', color)
      .attr('opacity', opacity)
      .attr('stroke', '#fff')
      .attr('stroke-width', HEX_STROKE_WIDTH)
      .attr('class', 'chunk-hexagon')
      .style('cursor', 'pointer')
      .style('filter', SHADOW_DEFAULT);

    polygon
      .on('mouseover', (event: MouseEvent) => {
        d3.select(polygon.node() as SVGPolygonElement)
          .transition()
          .duration(150)
          .attr('points', generateHexagonPoints(x, y, chunkRadius * 1.2))
          .attr('stroke-width', HEX_STROKE_WIDTH_HOVER)
          .style('filter', SHADOW_HOVER);

        if (!ctx.showTooltips) return;

        // Build HeatmapPoint for tooltip/click consumers
        const hp: HeatmapPoint = {
          id: `chunk_${ch.chunkId}`,
          x,
          y,
          size: chunkRadius * 2,
          color: avgSimilarity,
          opacity,
          screenX: x,
          screenY: y,
          data: {
            type: 'chunk',
            chunkId: ch.chunkId,
            content: ch.content,
            docId: ch.docId,
            title: ch.title,
            retrievalFrequency: ch.retrievalFrequency ?? 0,
            avgSimilarity: avgSimilarity ?? 0,
            isUnretrieved: isUnretrieved === true,
            bestQuestion: ch.bestRetrievingQuestion || ch.bestQuestion || undefined,
            retrievingQuestions: []
          } as any
        };

        ctx.setTooltipData(hp);

        const rect = ctx.svgRef.current?.getBoundingClientRect();
        const tooltipX = rect ? (event.clientX - rect.left) : event.clientX;
        const tooltipY = rect ? (event.clientY - rect.top) : event.clientY;
        ctx.setTooltipPosition({ x: tooltipX, y: tooltipY, visible: true });
      })
      .on('mouseout', () => {
        d3.select(polygon.node() as SVGPolygonElement)
          .transition()
          .duration(150)
          .attr('points', generateHexagonPoints(x, y, chunkRadius))
          .attr('stroke-width', HEX_STROKE_WIDTH)
          .style('filter', SHADOW_DEFAULT);
        ctx.setTooltipData(null);
        ctx.setTooltipPosition({ x: 0, y: 0, visible: false });
      })
      .on('click', (event: MouseEvent) => {
        event.stopPropagation();
        if (ctx.onPointClick) {
          ctx.onPointClick({
            id: `chunk_${ch.chunkId}`,
            x,
            y,
            size: chunkRadius * 2,
            color: avgSimilarity,
            opacity,
            screenX: x,
            screenY: y,
            data: {
              type: 'chunk',
              chunkId: ch.chunkId,
              content: ch.content,
              docId: ch.docId,
              title: ch.title,
              retrievalFrequency: ch.retrievalFrequency ?? 0,
              avgSimilarity: avgSimilarity ?? 0,
              isUnretrieved: isUnretrieved === true,
              bestQuestion: ch.bestRetrievingQuestion || ch.bestQuestion || undefined,
              retrievingQuestions: []
            } as any
          } as HeatmapPoint);
        }
      });
  });
}


