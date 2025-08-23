# -*- coding: utf-8 -*-
"""
Gap Analysis Service - Non-ML rule-based gap detection and recommendations
"""
from typing import List, Dict, Any, Optional
import logging
from collections import defaultdict, Counter
import re
import uuid
from services.quality_score_service import QualityScoreService

logger = logging.getLogger(__name__)

class GapAnalysisService:
    """Service for detecting content gaps and generating actionable recommendations"""
    
    def __init__(self):
        self.logger = logger
        
        # Rule-based topic patterns for categorization
        self.topic_patterns = {
            'payment': ['payment', 'pay', 'monthly', 'installment', 'amount', 'due'],
            'forgiveness': ['forgive', 'forgiveness', 'cancel', 'discharge', 'elimination'],
            'interest': ['interest', 'rate', 'apr', 'compound', 'accrue'],
            'eligibility': ['eligible', 'qualify', 'requirement', 'criteria', 'condition'],
            'application': ['apply', 'application', 'form', 'submit', 'process'],
            'consolidation': ['consolidate', 'consolidation', 'combine', 'merge'],
            'deferment': ['defer', 'deferment', 'postpone', 'delay', 'suspend'],
            'default': ['default', 'delinquent', 'missed', 'late', 'overdue'],
            'servicer': ['servicer', 'service', 'provider', 'company', 'lender']
        }
        
        # Effort estimation rules
        self.effort_rules = {
            'content_addition': {'Low': 1, 'Medium': 2, 'High': 3},
            'content_improvement': {'Low': 1, 'Medium': 1.5, 'High': 2.5},
            'retrieval_optimization': {'Low': 2, 'Medium': 3, 'High': 4}
        }
    
    def analyze_gaps(self, experiment_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Main gap analysis function using non-ML rule-based approach
        """
        self.logger.info(f"🔍 Starting gap analysis for {len(experiment_results)} results")
        
        if not experiment_results:
            return self._create_empty_gap_analysis()
        
        # Normalize results to ensure avg_quality_score is present (fallback from avg_similarity)
        normalized_results: List[Dict[str, Any]] = []
        for r in experiment_results:
            if 'avg_quality_score' in r:
                quality_score = r.get('avg_quality_score', 0.0)
            else:
                # Convert internal similarity (0-1) to quality score (0-10)
                quality_score = QualityScoreService.similarity_to_quality_score(r.get('avg_similarity', 0.0))
            normalized_results.append({**r, 'avg_quality_score': quality_score})

        # Filter low-performing queries (< 5.0 on 0-10 scale)
        low_score_queries = [r for r in normalized_results if r.get('avg_quality_score', 0.0) < 5.0]
        
        # Detect uncovered topics using topic pattern matching
        uncovered_topics = self._detect_uncovered_topics(normalized_results)
        
        # Identify weak coverage areas
        weak_coverage_areas = self._identify_weak_coverage_areas(normalized_results)
        
        # Generate actionable recommendations
        recommendations = self._generate_recommendations(low_score_queries, weak_coverage_areas)
        
        # Calculate gap summary statistics
        gap_summary = self._calculate_gap_summary(normalized_results, low_score_queries, recommendations)
        
        result = {
            'lowScoreQueries': low_score_queries,
            'uncoveredTopics': uncovered_topics,
            'weakCoverageAreas': weak_coverage_areas,
            'recommendations': recommendations,
            'gapSummary': gap_summary
        }
        
        self.logger.info(f"📊 Gap analysis complete: {gap_summary['totalGaps']} gaps found, {len(recommendations)} recommendations generated")
        return result
    
    def _detect_uncovered_topics(self, experiment_results: List[Dict[str, Any]]) -> List[str]:
        """Repurposed: Detect underperforming roles (avg quality < 4.0)."""
        role_scores = defaultdict(list)
        for result in experiment_results:
            role = (result.get('role_name') or 'Unknown').strip() or 'Unknown'
            role_scores[role].append(result.get('avg_quality_score', 0))

        underperforming_roles = []
        for role, scores in role_scores.items():
            if scores:
                avg_score = sum(scores) / len(scores)
                if avg_score < 4.0:
                    underperforming_roles.append(role)

        return underperforming_roles
    
    def _identify_weak_coverage_areas(self, experiment_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify roles with poor performance (aligns with Results page role analysis)."""
        role_stats = defaultdict(lambda: {'scores': [], 'queries': []})

        for result in experiment_results:
            role = (result.get('role_name') or 'Unknown').strip() or 'Unknown'
            score = result.get('avg_quality_score', 0)
            query = result.get('question', '')
            role_stats[role]['scores'].append(score)
            role_stats[role]['queries'].append(query)

        weak_areas = []
        for role, data in role_stats.items():
            if data['scores']:
                avg_score = sum(data['scores']) / len(data['scores'])
                query_count = len(data['scores'])
                # Only include roles with poor average performance (< 6.0) and multiple questions
                if avg_score < 6.0 and query_count >= 2:
                    # Calculate success rate for this role (questions >= 7.0)
                    good_questions = len([s for s in data['scores'] if s >= 7.0])
                    success_rate = (good_questions / query_count) * 100 if query_count > 0 else 0
                    
                    weak_areas.append({
                        'topic': role,  # Using 'topic' field name for frontend compatibility 
                        'avgScore': round(avg_score, 1),
                        'queryCount': query_count,
                        'affectedQueries': data['queries'][:3],  # Show sample questions
                        'gapType': self._determine_performance_category(avg_score),
                        'successRate': round(success_rate, 1),
                        'poorCount': len([s for s in data['scores'] if s < 5.0]),
                        'criticalCount': len([s for s in data['scores'] if s < 3.0])
                    })

        weak_areas.sort(key=lambda x: x['avgScore'])  # Sort by worst performance first
        return weak_areas
    
    def _determine_gap_type(self, avg_score: float, queries: List[str]) -> str:
        """Determine the type of gap based on score and query patterns"""
        if avg_score < 3.0:
            return 'coverage'  # Very poor scores indicate content gaps
        elif avg_score < 5.0:
            return 'quality'   # Medium-poor scores indicate quality issues
        else:
            return 'retrieval' # Relatively better scores indicate retrieval issues
    
    def _determine_performance_category(self, avg_score: float) -> str:
        """Determine performance category using Results page concepts"""
        if avg_score < 3.0:
            return 'critical'  # Critical performance issues
        elif avg_score < 5.0:
            return 'poor'      # Poor performance 
        else:
            return 'weak'      # Weak performance (but not poor)
    
    def _generate_recommendations(self, low_score_queries: List[Dict[str, Any]], 
                                weak_areas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations using rule-based approach"""
        recommendations = []
        
        # Generate recommendations for weak coverage areas
        for area in weak_areas:
            rec = self._create_area_recommendation(area)
            if rec:
                recommendations.append(rec)
        
        # Generate specific recommendations for very low scoring queries
        critical_queries = [q for q in low_score_queries if q.get('avg_quality_score', 0) < 3.0]
        for query in critical_queries[:3]:  # Limit to top 3 most critical
            rec = self._create_query_recommendation(query)
            if rec:
                recommendations.append(rec)
        
        # Sort by priority score (highest first)
        recommendations.sort(key=lambda x: x['priorityScore'], reverse=True)
        
        return recommendations[:6]  # Return top 6 recommendations
    
    def _create_area_recommendation(self, area: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a recommendation for a role with poor performance"""
        role = area['topic'].lower()  # 'topic' field contains role name
        performance_type = area['gapType']  # Using existing field but with new meaning
        avg_score = area['avgScore']
        query_count = area['queryCount']
        
        # Determine recommendation based on performance level and role
        if performance_type == 'critical':
            suggested_content = f"Review and enhance content for {role}-related questions. Current performance is critical (avg score: {avg_score})"
            category = 'role_improvement'
            effort = 'High' if query_count > 5 else 'Medium'
        elif performance_type == 'poor':
            suggested_content = f"Improve content quality for {role} questions to reach acceptable performance levels"
            category = 'content_improvement'  
            effort = 'Medium'
        else:  # weak
            suggested_content = f"Enhance {role} content to achieve GOOD quality score (≥7.0) from current WEAK level"
            category = 'quality_boost'
            effort = 'Low' if query_count <= 3 else 'Medium'
        
        # Calculate impact and priority based on Results page concepts
        impact = 'High' if avg_score < 3.0 else ('Medium' if avg_score < 5.0 else 'Low')
        effort_score = {'Low': 1, 'Medium': 2, 'High': 3}[effort]
        impact_score = {'High': 3, 'Medium': 2, 'Low': 1}[impact]
        priority_score = impact_score * (1 / effort_score)
        
        priority_level = 'High' if priority_score >= 2.0 else ('Medium' if priority_score >= 1.0 else 'Low')
        
        return {
            'id': str(uuid.uuid4())[:8],
            'gapDescription': f"Role '{role}' shows poor performance: {query_count} questions averaging {avg_score}/10",
            'suggestedContent': suggested_content,
            'expectedImprovement': min(10.0, avg_score + (10 - avg_score) * 0.6),  # 60% improvement potential
            'priorityLevel': priority_level,
            'priorityScore': round(priority_score, 2),
            'affectedQueries': area['affectedQueries'],
            'implementationEffort': effort,
            'impact': impact,
            'category': category
        }
    
    def _create_query_recommendation(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a specific recommendation for a critical query"""
        question = query.get('question', '')
        score = query.get('avg_quality_score', 0)
        
        # Extract key terms from the question for content suggestion
        key_terms = self._extract_key_terms(question)
        
        return {
            'id': str(uuid.uuid4())[:8],
            'gapDescription': f"Critical query failure: '{question[:60]}...' (score: {score})",
            'suggestedContent': f"Add specific content addressing: {', '.join(key_terms)}",
            'expectedImprovement': min(10.0, score + 5.0),  # Significant improvement for critical fixes
            'priorityLevel': 'High',
            'priorityScore': 3.0,  # Critical queries get highest priority
            'affectedQueries': [question],
            'implementationEffort': 'Medium',
            'impact': 'High',
            'category': 'content_addition'
        }
    
    def _extract_key_terms(self, question: str) -> List[str]:
        """Extract key terms from a question for content suggestions"""
        # Simple keyword extraction - remove common words and extract meaningful terms
        common_words = {'what', 'how', 'when', 'where', 'why', 'is', 'are', 'can', 'do', 'does', 'will', 'would', 'should', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'my', 'i', 'me'}
        
        words = re.findall(r'\b\w+\b', question.lower())
        key_terms = [word for word in words if word not in common_words and len(word) > 3]
        
        return key_terms[:4]  # Return top 4 key terms
    
    def _calculate_gap_summary(self, all_results: List[Dict[str, Any]], 
                             low_score_queries: List[Dict[str, Any]], 
                             recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate summary statistics for the gap analysis"""
        total_questions = len(all_results)
        total_gaps = len(low_score_queries)
        critical_gaps = len([q for q in low_score_queries if q.get('avg_quality_score', 0) < 3.0])
        # Below GOOD threshold (aligns with Results page success rate complement)
        good_threshold = QualityScoreService.get_quality_thresholds()['GOOD']
        below_good_count = len([r for r in all_results if r.get('avg_quality_score', 0) < good_threshold])
        
        # Calculate average gap score
        avg_gap_score = 0.0
        if low_score_queries:
            avg_gap_score = sum(q.get('avg_quality_score', 0) for q in low_score_queries) / len(low_score_queries)
        
        # Estimate improvement potential based on recommendations
        improvement_potential = 0.0
        if recommendations:
            improvement_potential = sum(r['expectedImprovement'] for r in recommendations) / len(recommendations)
        
        return {
            'totalGaps': total_gaps,
            'criticalGaps': critical_gaps,
            'avgGapScore': round(avg_gap_score, 1),
            'improvementPotential': round(improvement_potential, 1),
            'gapPercentage': round((total_gaps / max(total_questions, 1)) * 100, 1),
            'totalQuestions': total_questions,
            'belowGoodCount': below_good_count,
            'belowGoodPercentage': round((below_good_count / max(total_questions, 1)) * 100, 1)
        }
    
    def _create_empty_gap_analysis(self) -> Dict[str, Any]:
        """Create empty gap analysis for when no experiment results exist"""
        return {
            'lowScoreQueries': [],
            'uncoveredTopics': [],
            'weakCoverageAreas': [],
            'recommendations': [],
            'gapSummary': {
                'totalGaps': 0,
                'criticalGaps': 0,
                'avgGapScore': 0.0,
                'improvementPotential': 0.0,
                'gapPercentage': 0.0,
                'totalQuestions': 0
            }
        }