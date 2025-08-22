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
        """Detect topics that are mentioned in questions but have poor retrieval coverage"""
        question_topics = Counter()
        
        # Extract topics from all questions
        for result in experiment_results:
            question_text = result.get('question', '').lower()
            for topic, patterns in self.topic_patterns.items():
                if any(pattern in question_text for pattern in patterns):
                    question_topics[topic] += 1
        
        # Find topics with consistently low scores
        uncovered = []
        for topic in question_topics:
            topic_results = []
            for result in experiment_results:
                question_text = result.get('question', '').lower()
                if any(pattern in question_text for pattern in self.topic_patterns[topic]):
                    topic_results.append(result.get('avg_quality_score', 0))
            
            if topic_results:
                avg_score = sum(topic_results) / len(topic_results)
                if avg_score < 4.0:  # Topics with average score < 4.0 are considered uncovered
                    uncovered.append(topic.title())
        
        return uncovered
    
    def _identify_weak_coverage_areas(self, experiment_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify areas with weak coverage using topic clustering"""
        topic_stats = defaultdict(lambda: {'scores': [], 'queries': []})
        
        # Group results by detected topics
        for result in experiment_results:
            question_text = result.get('question', '').lower()
            score = result.get('avg_quality_score', 0)
            query = result.get('question', '')
            
            # Assign to topics based on pattern matching
            assigned_topics = []
            for topic, patterns in self.topic_patterns.items():
                if any(pattern in question_text for pattern in patterns):
                    topic_stats[topic]['scores'].append(score)
                    topic_stats[topic]['queries'].append(query)
                    assigned_topics.append(topic)
            
            # If no topic matches, classify as 'general'
            if not assigned_topics:
                topic_stats['general']['scores'].append(score)
                topic_stats['general']['queries'].append(query)
        
        # Identify weak areas
        weak_areas = []
        for topic, data in topic_stats.items():
            if data['scores']:
                avg_score = sum(data['scores']) / len(data['scores'])
                query_count = len(data['scores'])
                
                if avg_score < 6.0 and query_count >= 2:  # Weak if avg < 6.0 and at least 2 queries
                    weak_areas.append({
                        'topic': topic.title(),
                        'avgScore': round(avg_score, 1),
                        'queryCount': query_count,
                        'affectedQueries': data['queries'][:3],  # Show first 3 affected queries
                        'gapType': self._determine_gap_type(avg_score, data['queries'])
                    })
        
        # Sort by severity (lowest score first)
        weak_areas.sort(key=lambda x: x['avgScore'])
        return weak_areas
    
    def _determine_gap_type(self, avg_score: float, queries: List[str]) -> str:
        """Determine the type of gap based on score and query patterns"""
        if avg_score < 3.0:
            return 'coverage'  # Very poor scores indicate content gaps
        elif avg_score < 5.0:
            return 'quality'   # Medium-poor scores indicate quality issues
        else:
            return 'retrieval' # Relatively better scores indicate retrieval issues
    
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
        """Create a recommendation for a weak coverage area"""
        topic = area['topic'].lower()
        gap_type = area['gapType']
        avg_score = area['avgScore']
        query_count = area['queryCount']
        
        # Determine recommendation based on gap type and topic
        if gap_type == 'coverage':
            suggested_content = f"Add comprehensive documentation about {topic} including definitions, processes, and common scenarios"
            category = 'content_addition'
            effort = 'Medium' if query_count > 5 else 'Low'
        elif gap_type == 'quality':
            suggested_content = f"Improve existing {topic} content with more detailed explanations and examples"
            category = 'content_improvement'  
            effort = 'Low'
        else:  # retrieval
            suggested_content = f"Optimize document chunking and indexing for {topic}-related content"
            category = 'retrieval_optimization'
            effort = 'Medium'
        
        # Calculate impact and priority
        impact = 'High' if avg_score < 3.0 else ('Medium' if avg_score < 5.0 else 'Low')
        effort_score = self.effort_rules[category][effort]
        impact_score = {'High': 3, 'Medium': 2, 'Low': 1}[impact]
        priority_score = impact_score * (1 / effort_score)
        
        priority_level = 'High' if priority_score >= 2.0 else ('Medium' if priority_score >= 1.0 else 'Low')
        
        return {
            'id': str(uuid.uuid4())[:8],
            'gapDescription': f"Poor performance in {topic} queries (avg score: {avg_score})",
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
            'totalQuestions': total_questions
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