# -*- coding: utf-8 -*-
"""
Gap Analysis Service - Non-ML rule-based gap detection and recommendations
Generic implementation that works with any dataset
"""
from typing import List, Dict, Any, Optional
import logging
from collections import defaultdict, Counter
import re
import uuid
from services.quality_score_service import QualityScoreService
from config.settings import (
    GAP_ANALYSIS_THRESHOLDS, 
    GAP_ANALYSIS_PERCENTAGES, 
    GAP_ANALYSIS_PRIORITY_SCORES
)

logger = logging.getLogger(__name__)

class GapAnalysisService:
    """Generic service for detecting content gaps and generating actionable recommendations"""
    
    def __init__(self):
        self.logger = logger
        
        # Generic effort estimation rules (domain-agnostic)
        self.effort_rules = {
            'content_addition': {'Low': 1, 'Medium': 2, 'High': 3},
            'content_improvement': {'Low': 1, 'Medium': 1.5, 'High': 2.5},
            'retrieval_optimization': {'Low': 2, 'Medium': 3, 'High': 4}
        }
    
    def analyze_gaps(self, experiment_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Main gap analysis function using non-ML rule-based approach
        Generic implementation that works with any dataset
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
        low_score_queries = [r for r in normalized_results if r.get('avg_quality_score', 0.0) < GAP_ANALYSIS_THRESHOLDS['WEAK']]
        
        # Detect uncovered topics using dynamic analysis (no hardcoded patterns)
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
        """Detect underperforming roles/categories (avg quality < 4.0) - generic implementation."""
        role_scores = defaultdict(list)
        for result in experiment_results:
            # Use role_name if available, otherwise fall back to source or create generic category
            role = (result.get('role_name') or result.get('source') or 'General').strip() or 'General'
            role_scores[role].append(result.get('avg_quality_score', 0))

        underperforming_roles = []
        for role, scores in role_scores.items():
            if scores:
                avg_score = sum(scores) / len(scores)
                if avg_score < GAP_ANALYSIS_THRESHOLDS['POOR']:
                    underperforming_roles.append(role)

        return underperforming_roles
    
    def _identify_weak_coverage_areas(self, experiment_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify roles/categories with poor performance - generic implementation."""
        role_stats = defaultdict(lambda: {'scores': [], 'queries': []})

        for result in experiment_results:
            # Use role_name if available, otherwise fall back to source or create generic category
            role = (result.get('role_name') or result.get('source') or 'General').strip() or 'General'
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
                if avg_score < GAP_ANALYSIS_THRESHOLDS['MINIMUM_ACCEPTABLE'] and query_count >= 2:
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
                        'poorCount': len([s for s in data['scores'] if s < GAP_ANALYSIS_THRESHOLDS['WEAK']]),
                        'criticalCount': len([s for s in data['scores'] if s < GAP_ANALYSIS_THRESHOLDS['CRITICAL']])
                    })

        weak_areas.sort(key=lambda x: x['avgScore'])  # Sort by worst performance first
        return weak_areas
    
    def _determine_performance_category(self, avg_score: float) -> str:
        """Determine performance category using generic thresholds"""
        if avg_score < GAP_ANALYSIS_THRESHOLDS['CRITICAL']:
            return 'critical'  # Critical performance issues
        elif avg_score < GAP_ANALYSIS_THRESHOLDS['WEAK']:
            return 'poor'      # Poor performance 
        else:
            return 'weak'      # Weak performance (but not poor)
    
    def _generate_recommendations(self, low_score_queries: List[Dict[str, Any]], 
                                weak_areas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations using rule-based approach - generic implementation"""
        recommendations = []
        
        # Generate recommendations for weak coverage areas
        for area in weak_areas:
            rec = self._create_area_recommendation(area)
            if rec:
                recommendations.append(rec)
        
        # Generate specific recommendations for very low scoring queries
        critical_queries = [q for q in low_score_queries if q.get('avg_quality_score', 0) < GAP_ANALYSIS_THRESHOLDS['CRITICAL']]
        for query in critical_queries[:3]:  # Limit to top 3 most critical
            rec = self._create_query_recommendation(query)
            if rec:
                recommendations.append(rec)
        
        # Sort by priority score (highest first)
        recommendations.sort(key=lambda x: x['priorityScore'], reverse=True)
        
        return recommendations[:6]  # Return top 6 recommendations
    
    def _create_area_recommendation(self, area: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a recommendation for a role/category with poor performance - generic implementation"""
        role = area['topic'].lower()  # 'topic' field contains role/category name
        performance_type = area['gapType']
        avg_score = area['avgScore']
        query_count = area['queryCount']
        
        # Generate practical improvement strategies based on performance level and role characteristics
        improvement_strategies = self._generate_improvement_strategies(role, performance_type, avg_score, query_count)
        
        # Determine recommendation based on performance level - generic approach
        if performance_type == 'critical':
            suggested_content = improvement_strategies['primary_strategy']
            category = 'role_improvement'
            effort = 'High' if query_count > 5 else 'Medium'
        elif performance_type == 'poor':
            suggested_content = improvement_strategies['primary_strategy']
            category = 'content_improvement'  
            effort = 'Medium'
        else:  # weak
            suggested_content = improvement_strategies['primary_strategy']
            category = 'quality_boost'
            effort = 'Low' if query_count <= 3 else 'Medium'
        
        # Calculate impact and priority based on generic performance metrics
        impact = 'High' if avg_score < GAP_ANALYSIS_THRESHOLDS['CRITICAL'] else ('Medium' if avg_score < GAP_ANALYSIS_THRESHOLDS['WEAK'] else 'Low')
        effort_score = {'Low': 1, 'Medium': 2, 'High': 3}[effort]
        impact_score = {'High': 3, 'Medium': 2, 'Low': 1}[impact]
        priority_score = impact_score * (1 / effort_score)
        
        priority_level = 'High' if priority_score >= GAP_ANALYSIS_PRIORITY_SCORES['HIGH'] else ('Medium' if priority_score >= GAP_ANALYSIS_PRIORITY_SCORES['MEDIUM'] else 'Low')
        
        return {
            'id': str(uuid.uuid4())[:8],
            'gapDescription': f"Category '{role}' shows poor performance: {query_count} questions averaging {avg_score}/10",
            'suggestedContent': suggested_content,
            'improvementStrategies': improvement_strategies['all_strategies'],
            'expectedImprovement': min(GAP_ANALYSIS_THRESHOLDS['MAX_SCORE'], avg_score + (GAP_ANALYSIS_THRESHOLDS['MAX_SCORE'] - avg_score) * GAP_ANALYSIS_PERCENTAGES['IMPROVEMENT_POTENTIAL']),  # 60% improvement potential
            'priorityLevel': priority_level,
            'priorityScore': round(priority_score, 2),
            'affectedQueries': area['affectedQueries'],
            'implementationEffort': effort,
            'impact': impact,
            'category': category
        }
    
    def _create_query_recommendation(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a specific recommendation for a critical query - generic implementation"""
        question = query.get('question', '')
        score = query.get('avg_quality_score', 0)
        
        # Extract key terms from the question for content suggestion
        key_terms = self._extract_key_terms(question)
        
        return {
            'id': str(uuid.uuid4())[:8],
            'gapDescription': f"Critical query failure: '{question[:60]}...' (score: {score})",
            'suggestedContent': f"Add specific content addressing: {', '.join(key_terms)}",
            'expectedImprovement': min(GAP_ANALYSIS_THRESHOLDS['MAX_SCORE'], score + GAP_ANALYSIS_PERCENTAGES['CRITICAL_IMPROVEMENT']),  # Significant improvement for critical fixes
            'priorityLevel': 'High',
            'priorityScore': GAP_ANALYSIS_PRIORITY_SCORES['CRITICAL'],  # Critical queries get highest priority
            'affectedQueries': [question],
            'implementationEffort': 'Medium',
            'impact': 'High',
            'category': 'content_addition'
        }
    
    def _generate_improvement_strategies(self, role: str, performance_type: str, avg_score: float, query_count: int) -> Dict[str, Any]:
        """Generate practical improvement strategies based on role and performance characteristics"""
        
        # Define role-based improvement strategies
        role_strategies = {
            'developer': {
                'critical': [
                    f"📚 **Documentation Audit**: Review existing technical documentation for {role} workflows and identify missing API references, code examples, and troubleshooting guides",
                    f"🔍 **Knowledge Gap Analysis**: Conduct interviews with senior {role}s to identify common pain points and undocumented solutions",
                    f"📝 **Code Repository Mining**: Extract code comments, README files, and commit messages to build comprehensive technical knowledge base"
                ],
                'poor': [
                    f"📖 **Enhanced Documentation**: Create step-by-step guides with code examples for {role} common tasks and error scenarios",
                    f"🎯 **Best Practices Compilation**: Gather and document proven solutions from experienced {role}s in your organization",
                    f"🔄 **Process Documentation**: Document development workflows, deployment procedures, and debugging methodologies"
                ],
                'weak': [
                    f"📋 **Quick Reference Guides**: Create concise cheat sheets for {role} daily tasks and common commands",
                    f"💡 **Tips & Tricks Collection**: Compile practical tips from team members to improve {role} productivity",
                    f"📊 **Performance Optimization**: Document performance tuning techniques and optimization strategies"
                ]
            },
            'support': {
                'critical': [
                    f"📞 **Support Ticket Analysis**: Analyze recent support tickets for {role} to identify recurring issues and knowledge gaps",
                    f"🎤 **Customer Feedback Collection**: Conduct surveys and interviews with {role} users to understand their most pressing needs",
                    f"📋 **FAQ Development**: Create comprehensive FAQ sections based on actual {role} support interactions"
                ],
                'poor': [
                    f"📚 **Knowledge Base Enhancement**: Expand troubleshooting guides with detailed step-by-step solutions for {role} issues",
                    f"🎯 **Escalation Procedures**: Document clear escalation paths and resolution procedures for {role} complex problems",
                    f"📱 **Self-Service Tools**: Develop self-service resources to reduce {role} support ticket volume"
                ],
                'weak': [
                    f"📖 **Quick Start Guides**: Create easy-to-follow onboarding materials for {role} new users",
                    f"🔧 **Common Solutions**: Compile quick fixes for {role} frequently encountered issues",
                    f"📈 **Performance Metrics**: Document key performance indicators and optimization strategies"
                ]
            },
            'admin': {
                'critical': [
                    f"🔐 **Security Documentation**: Create comprehensive security protocols and access management guides for {role}",
                    f"⚙️ **System Configuration**: Document all system configurations, backup procedures, and disaster recovery plans",
                    f"📊 **Monitoring Setup**: Establish comprehensive monitoring and alerting documentation for {role} responsibilities"
                ],
                'poor': [
                    f"📋 **Operational Procedures**: Develop detailed operational runbooks for {role} daily tasks and maintenance",
                    f"🔄 **Automation Documentation**: Document automation scripts and tools used by {role} for efficiency",
                    f"📈 **Performance Tuning**: Create guides for system optimization and performance monitoring"
                ],
                'weak': [
                    f"📖 **Quick Reference**: Develop quick reference cards for {role} common administrative tasks",
                    f"💡 **Best Practices**: Compile best practices for {role} system management and user administration",
                    f"🔧 **Troubleshooting**: Create troubleshooting guides for {role} common system issues"
                ]
            },
            'customer': {
                'critical': [
                    f"📞 **Customer Journey Mapping**: Analyze complete customer journey to identify {role} pain points and information needs",
                    f"🎯 **User Research**: Conduct user interviews and surveys to understand {role} expectations and knowledge gaps",
                    f"📊 **Usage Analytics**: Analyze user behavior data to identify where {role} users struggle most"
                ],
                'poor': [
                    f"📚 **User Guide Enhancement**: Improve user guides with more examples, screenshots, and troubleshooting for {role}",
                    f"🎨 **UI/UX Documentation**: Create comprehensive guides for {role} interface navigation and feature usage",
                    f"📱 **Mobile Experience**: Develop mobile-specific documentation for {role} on-the-go users"
                ],
                'weak': [
                    f"📖 **Getting Started**: Create engaging onboarding materials for {role} new users",
                    f"💡 **Feature Highlights**: Develop guides highlighting key features and benefits for {role}",
                    f"🔧 **Quick Tips**: Compile quick tips and shortcuts for {role} power users"
                ]
            }
        }
        
        # Default strategies for any role
        default_strategies = {
            'critical': [
                f"📚 **Comprehensive Content Audit**: Review all existing documentation for {role} and identify major knowledge gaps",
                f"🎤 **Stakeholder Interviews**: Conduct interviews with {role} team members to understand their information needs",
                f"📊 **Usage Pattern Analysis**: Analyze how {role} currently searches for information and identify improvement opportunities"
            ],
            'poor': [
                f"📖 **Content Enhancement**: Improve existing {role} documentation with more detailed explanations and examples",
                f"🎯 **Gap Filling**: Identify specific topics where {role} needs more information and create targeted content",
                f"🔄 **Process Documentation**: Document {role} workflows and procedures that are currently undocumented"
            ],
            'weak': [
                f"📋 **Quick Wins**: Focus on low-effort improvements to existing {role} content quality and organization",
                f"💡 **Best Practices**: Compile and document best practices for {role} from experienced team members",
                f"🔧 **Tool Integration**: Improve how {role} accesses and searches for information"
            ]
        }
        
        # Select appropriate strategies based on role and performance
        role_key = self._identify_role_type(role)
        if role_key in role_strategies:
            strategies = role_strategies[role_key][performance_type]
        else:
            strategies = default_strategies[performance_type]
        
        # Add data collection strategies based on performance severity
        data_collection_strategies = self._generate_data_collection_strategies(role, performance_type, query_count)
        
        # Combine all strategies
        all_strategies = strategies + data_collection_strategies
        
        return {
            'primary_strategy': strategies[0] if strategies else f"Improve content quality for {role} questions",
            'all_strategies': all_strategies
        }
    
    def _identify_role_type(self, role: str) -> str:
        """Identify the type of role for strategy selection"""
        role_lower = role.lower()
        
        if any(word in role_lower for word in ['developer', 'engineer', 'programmer', 'coder', 'dev']):
            return 'developer'
        elif any(word in role_lower for word in ['support', 'helpdesk', 'customer service', 'service desk']):
            return 'support'
        elif any(word in role_lower for word in ['admin', 'administrator', 'system admin', 'sysadmin']):
            return 'admin'
        elif any(word in role_lower for word in ['customer', 'user', 'client', 'end user']):
            return 'customer'
        else:
            return 'general'
    
    def _generate_data_collection_strategies(self, role: str, performance_type: str, query_count: int) -> List[str]:
        """Generate data collection strategies based on performance and query count"""
        strategies = []
        
        if performance_type == 'critical':
            strategies.extend([
                "🔍 **Internal Knowledge Mining**: Extract tacit knowledge from {role} team members through structured interviews and knowledge sharing sessions",
                "📊 **External Research**: Gather industry best practices and standards relevant to {role} from professional communities and publications",
                "🤖 **LLM-Generated Content**: Use AI to generate initial content drafts for {role} topics, then validate with subject matter experts"
            ])
        elif performance_type == 'poor':
            strategies.extend([
                "📋 <b>Survey Implementation</b>: Conduct targeted surveys with {role} team to identify specific information gaps and improvement areas",
                "📚 **External Documentation**: Research and incorporate relevant external documentation and resources for {role}",
                "🔄 **Content Validation**: Use LLMs to generate content variations for {role} topics and validate accuracy with domain experts"
            ])
        else:  # weak
            strategies.extend([
                "💡 **Quick Content Generation**: Use AI tools to quickly generate additional content for {role} based on existing high-performing topics",
                "📖 **Resource Compilation**: Gather and organize existing internal resources and external references for {role}",
                "🎯 **Targeted Enhancement**: Focus on improving specific {role} content areas based on user feedback and usage patterns"
            ])
        
        # Add role-specific data collection strategies
        if query_count > 10:
            strategies.append("📈 **Analytics-Driven Enhancement**: Use query analytics to identify {role} topics with high search volume but low satisfaction scores")
        
        return strategies

    def _extract_key_terms(self, question: str) -> List[str]:
        """Extract key terms from a question for content suggestions - generic implementation"""
        # Simple keyword extraction - remove common words and extract meaningful terms
        common_words = {'what', 'how', 'when', 'where', 'why', 'is', 'are', 'can', 'do', 'does', 'will', 'would', 'should', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'my', 'i', 'me'}
        
        words = re.findall(r'\b\w+\b', question.lower())
        key_terms = [word for word in words if word not in common_words and len(word) > 3]
        
        return key_terms[:4]  # Return top 4 key terms
    
    def _calculate_gap_summary(self, all_results: List[Dict[str, Any]], 
                             low_score_queries: List[Dict[str, Any]], 
                             recommendations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate summary statistics for the gap analysis - generic implementation"""
        total_questions = len(all_results)
        
        # Get quality score thresholds
        good_threshold = QualityScoreService.get_quality_thresholds()['GOOD']  # 7.0
        weak_threshold = QualityScoreService.get_quality_thresholds()['WEAK']  # 5.0
        
        # Calculate correct statistics
        good_count = len([r for r in all_results if r.get('avg_quality_score', 0) >= good_threshold])
        weak_count = len([r for r in all_results if weak_threshold <= r.get('avg_quality_score', 0) < good_threshold])
        poor_count = len([r for r in all_results if r.get('avg_quality_score', 0) < weak_threshold])
        
        # Below GOOD threshold (aligns with Results page success rate complement)
        below_good_count = weak_count + poor_count
        
        # Total gaps are the poor performing queries (below weak threshold)
        total_gaps = poor_count
        critical_gaps = len([q for q in low_score_queries if q.get('avg_quality_score', 0) < GAP_ANALYSIS_THRESHOLDS['CRITICAL']])
        
        # Calculate average gap score
        avg_gap_score = 0.0
        if low_score_queries:
            avg_gap_score = sum(q.get('avg_quality_score', 0) for q in low_score_queries) / len(low_score_queries)
        
        # Calculate improvement potential as average boost from recommendations  
        improvement_potential = 0.0
        if recommendations:
            # Simple approach: average improvement shown in UI should be reasonable boost amount
            # For critical queries (0 score), a boost to 5.0 means +5.0 improvement
            # For role issues, improvement is calculated as 60% of gap to perfect (10.0)
            avg_expected = sum(r['expectedImprovement'] for r in recommendations) / len(recommendations)
            # Since most critical queries start at 0 and improve to ~5, the boost is the target score
            # But we want to show realistic boost amounts, so cap at reasonable levels
            improvement_potential = min(5.0, avg_expected * GAP_ANALYSIS_PERCENTAGES['REALISTIC_BOOST'])  # 80% of target as realistic boost
        
        return {
            'totalGaps': total_gaps,
            'criticalGaps': critical_gaps,
            'avgGapScore': round(avg_gap_score, 1),
            'improvementPotential': round(improvement_potential, 1),
            'gapPercentage': round((total_gaps / max(total_questions, 1)) * 100, 1),
            'totalQuestions': total_questions,
            'belowGoodCount': below_good_count,
            'belowGoodPercentage': round((below_good_count / max(total_questions, 1)) * 100, 1),
            'goodCount': good_count,
            'weakCount': weak_count,
            'poorCount': poor_count,
            'weakQuestionsCount': weak_count,  # Questions with score 5.0-6.9
            'poorQuestionsCount': poor_count   # Questions with score <5.0
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