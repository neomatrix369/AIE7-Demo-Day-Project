# -*- coding: utf-8 -*-
"""
Quality Score Service

Centralized service for all quality score related operations.
This eliminates duplication and provides a single source of truth for:
- Quality score thresholds
- Similarity to quality score conversion
- Quality status determination
- Quality-based filtering and analysis

Following the Four Rules of Simple Design:
1. Tests pass - Maintains exact same functionality
2. Reveals intent - Clear, single-purpose service
3. No duplication - Consolidates scattered quality logic
4. Fewest elements - Minimal, focused interface
"""

from typing import List, Dict, Any, Literal
from config.settings import QUALITY_THRESHOLDS

QualityStatus = Literal['good', 'weak', 'poor']


class QualityScoreService:
    """Service for quality score calculations and determinations."""
    
    @staticmethod
    def similarity_to_quality_score(similarity: float) -> float:
        """
        Transform similarity score from 0-1 scale to 0-10 quality score scale.
        
        Args:
            similarity: Similarity score between 0 and 1
            
        Returns:
            Quality score between 0 and 10, rounded to 1 decimal place
        """
        return round(similarity * 10, 1)
    
    @staticmethod
    def calculate_average_quality_score(similarities: List[float]) -> float:
        """
        Calculate average quality score from a list of similarity scores.
        This is the CORRECT method: average similarities first, then convert to quality score.
        
        Args:
            similarities: List of similarity scores between 0 and 1
            
        Returns:
            Average quality score between 0 and 10, rounded to 1 decimal place
        """
        if not similarities:
            return 0.0
        
        avg_similarity = sum(similarities) / len(similarities)
        return QualityScoreService.similarity_to_quality_score(avg_similarity)
    
    @staticmethod
    def get_quality_status(quality_score: float) -> QualityStatus:
        """
        Determine status based on quality score using consistent thresholds.
        
        Args:
            quality_score: Quality score between 0 and 10
            
        Returns:
            Status string: 'good', 'weak', or 'poor'
        """
        if quality_score >= QUALITY_THRESHOLDS['GOOD']:
            return "good"
        elif quality_score >= QUALITY_THRESHOLDS['WEAK']:
            return "weak"
        else:
            return "poor"
    
    @staticmethod
    def calculate_success_rate(quality_scores: List[float]) -> float:
        """
        Calculate success rate as percentage of scores >= GOOD threshold.
        
        Args:
            quality_scores: List of quality scores
            
        Returns:
            Success rate as float between 0 and 1
        """
        if not quality_scores:
            return 0.0
        
        good_scores = [s for s in quality_scores if s >= QUALITY_THRESHOLDS['GOOD']]
        return len(good_scores) / len(quality_scores)
    

    
    @staticmethod
    def calculate_distribution_stats(quality_scores: List[float]) -> Dict[str, int]:
        """
        Calculate distribution of quality scores by status.
        
        Args:
            quality_scores: List of quality scores
            
        Returns:
            Dictionary with counts for each quality status
        """
        distribution = {"good": 0, "weak": 0, "poor": 0}
        
        for score in quality_scores:
            status = QualityScoreService.get_quality_status(score)
            distribution[status] += 1
            
        return distribution
    
    @staticmethod
    def filter_by_quality(items: List[Dict[str, Any]], 
                         quality_filter: str, 
                         quality_field: str = 'quality_score') -> List[Dict[str, Any]]:
        """
        Filter items by quality status.
        
        Args:
            items: List of items with quality scores
            quality_filter: Filter type ('all', 'good', 'weak', 'poor')
            quality_field: Field name containing quality score
            
        Returns:
            Filtered list of items
        """
        if quality_filter == 'all':
            return items
        
        return [
            item for item in items 
            if QualityScoreService.get_quality_status(item.get(quality_field, 0)) == quality_filter
        ]
    
    @staticmethod
    def get_quality_thresholds() -> Dict[str, float]:
        """
        Get quality score thresholds for external use.
        
        Returns:
            Dictionary of quality thresholds
        """
        return QUALITY_THRESHOLDS.copy()