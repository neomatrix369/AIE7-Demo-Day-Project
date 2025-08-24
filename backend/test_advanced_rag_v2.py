#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced RAG v2 Testing - Detailed Before/After Comparison
Date: August 24, 2025
"""

import json
import asyncio
from typing import Dict, List, Any
from managers.search_manager import SearchManager
from managers.enhanced_rag_manager import EnhancedRAGManager
from managers.advanced_rag_v2 import AdvancedRAGv2
from managers.qdrant_manager import QdrantManager
from managers.data_manager import DataManager
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()

class RAGComparison:
    """Compare different RAG implementations with detailed examples."""
    
    def __init__(self):
        # Initialize managers
        self.qdrant_manager = QdrantManager(collection_name="student_loan_corpus")
        self.data_manager = DataManager(data_folder=os.getenv("DATA_FOLDER"))
        self.search_manager = SearchManager(self.data_manager, self.qdrant_manager)
        self.enhanced_rag = EnhancedRAGManager(self.search_manager)
        self.advanced_rag_v2 = AdvancedRAGv2(self.search_manager)
        
        # Test queries organized by difficulty and type
        self.test_queries = {
            'simple': [
                "What is GPT-5's MMLU score?",
                "How many parameters does Claude 3 Opus have?",
                "Is Llama 3 open source?"
            ],
            'comparison': [
                "Compare GPT-5 and Claude 3 Opus on reasoning tasks",
                "What's the difference between Gemini Ultra and GPT-4 performance?",
                "Which model is better for coding: DeepSeek or GPT-OSS?"
            ],
            'complex': [
                "What are the hardware requirements for running GPT-OSS-120B and how do they compare to Llama 3 70B?",
                "Which models support both vision and audio inputs, and what are their context window sizes?",
                "For a startup with limited budget, which model offers the best performance-to-cost ratio for customer service automation?"
            ],
            'technical': [
                "Explain the architecture differences between MoE models like GPT-OSS and dense models like Claude",
                "What safety measures and alignment techniques are used in Anthropic's Constitutional AI?",
                "How does DeepSeek's thinking mode work and what's the latency impact?"
            ]
        }
    
    def run_detailed_comparison(self):
        """Run detailed comparison with before/after examples."""
        print("=" * 100)
        print("🔬 ADVANCED RAG v2 - DETAILED BEFORE/AFTER COMPARISON")
        print(f"📅 Date: August 24, 2025")
        print("=" * 100)
        
        all_results = []
        
        for category, queries in self.test_queries.items():
            print(f"\n{'='*80}")
            print(f"📁 CATEGORY: {category.upper()}")
            print(f"{'='*80}")
            
            for query in queries:
                result = self.compare_single_query(query, category)
                all_results.append(result)
                self.print_detailed_comparison(result)
        
        # Generate summary statistics
        self.print_summary_statistics(all_results)
        
        # Save detailed results
        self.save_results(all_results)
    
    def compare_single_query(self, query: str, category: str) -> Dict[str, Any]:
        """Compare a single query across all RAG implementations."""
        
        result = {
            'query': query,
            'category': category,
            'timestamp': datetime.now().isoformat(),
            'comparisons': {}
        }
        
        # 1. Standard RAG (Baseline)
        print(f"\n{'─'*60}")
        print(f"📝 Query: {query}")
        print(f"{'─'*60}")
        
        standard_results = self.search_manager.vector_search(query, top_k=5)
        standard_score = sum(r.get('similarity', 0) for r in standard_results) / len(standard_results) if standard_results else 0
        
        result['comparisons']['standard'] = {
            'avg_score': standard_score,
            'num_docs': len(standard_results),
            'top_doc': self._extract_doc_info(standard_results[0] if standard_results else None),
            'method': 'Cosine similarity only'
        }
        
        # 2. Enhanced RAG (v1)
        enhanced_results, enhanced_score = self.enhanced_rag.enhanced_retrieve(query, top_k=5)
        
        result['comparisons']['enhanced'] = {
            'avg_score': enhanced_score,
            'num_docs': len(enhanced_results),
            'top_doc': self._extract_doc_info(enhanced_results[0] if enhanced_results else None),
            'method': 'Query expansion + Hybrid scoring + Reranking',
            'improvement_over_standard': ((enhanced_score - standard_score) / standard_score * 100) if standard_score > 0 else 0
        }
        
        # 3. Advanced RAG v2
        advanced_results, advanced_score, diagnostics = self.advanced_rag_v2.advanced_retrieve(query, top_k=5)
        
        result['comparisons']['advanced_v2'] = {
            'avg_score': advanced_score,
            'num_docs': len(advanced_results),
            'top_doc': self._extract_doc_info(advanced_results[0] if advanced_results else None),
            'method': 'Multi-stage + Contextual expansion + Answer-aware reranking',
            'improvement_over_standard': ((advanced_score - standard_score) / standard_score * 100) if standard_score > 0 else 0,
            'improvement_over_enhanced': ((advanced_score - enhanced_score) / enhanced_score * 100) if enhanced_score > 0 else 0,
            'diagnostics': {
                'query_type': diagnostics.get('query_type'),
                'sub_queries': diagnostics.get('sub_queries', []),
                'stages': len(diagnostics.get('stages', [])),
                'expanded_queries': len(diagnostics.get('expanded_queries', []))
            }
        }
        
        return result
    
    def _extract_doc_info(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key information from a document."""
        if not doc:
            return {'title': 'None', 'score': 0, 'preview': 'No document found'}
        
        return {
            'title': doc.get('title', 'Unknown')[:50],
            'score': round(doc.get('final_score', doc.get('similarity', 0)), 3),
            'preview': doc.get('content', '')[:100] + '...' if doc.get('content') else 'No content',
            'scoring_method': doc.get('scoring_method', 'standard')
        }
    
    def print_detailed_comparison(self, result: Dict[str, Any]):
        """Print detailed before/after comparison."""
        query = result['query']
        
        print(f"\n🔍 BEFORE (Standard RAG):")
        standard = result['comparisons']['standard']
        print(f"   Score: {standard['avg_score']:.3f}")
        print(f"   Docs: {standard['num_docs']}")
        print(f"   Top Result: {standard['top_doc']['title']}")
        print(f"   Preview: {standard['top_doc']['preview'][:80]}...")
        
        print(f"\n✨ AFTER v1 (Enhanced RAG):")
        enhanced = result['comparisons']['enhanced']
        print(f"   Score: {enhanced['avg_score']:.3f} (+{enhanced['improvement_over_standard']:.1f}%)")
        print(f"   Docs: {enhanced['num_docs']}")
        print(f"   Top Result: {enhanced['top_doc']['title']}")
        print(f"   Method: {enhanced['method']}")
        
        print(f"\n🚀 AFTER v2 (Advanced RAG):")
        advanced = result['comparisons']['advanced_v2']
        print(f"   Score: {advanced['avg_score']:.3f} (+{advanced['improvement_over_standard']:.1f}% vs standard, +{advanced['improvement_over_enhanced']:.1f}% vs enhanced)")
        print(f"   Docs: {advanced['num_docs']}")
        print(f"   Top Result: {advanced['top_doc']['title']}")
        print(f"   Query Type: {advanced['diagnostics']['query_type']}")
        print(f"   Sub-queries: {len(advanced['diagnostics']['sub_queries'])}")
        print(f"   Expansion: {advanced['diagnostics']['expanded_queries']} variants")
        print(f"   Stages: {advanced['diagnostics']['stages']}")
        
        # Show improvement indicators
        if advanced['improvement_over_enhanced'] > 10:
            print(f"   ⭐ SIGNIFICANT IMPROVEMENT: +{advanced['improvement_over_enhanced']:.1f}% better than Enhanced RAG")
    
    def print_summary_statistics(self, all_results: List[Dict[str, Any]]):
        """Print summary statistics across all queries."""
        print(f"\n{'='*100}")
        print(f"📊 SUMMARY STATISTICS")
        print(f"{'='*100}")
        
        # Calculate averages by category
        categories = {}
        for result in all_results:
            cat = result['category']
            if cat not in categories:
                categories[cat] = {'standard': [], 'enhanced': [], 'advanced': []}
            
            categories[cat]['standard'].append(result['comparisons']['standard']['avg_score'])
            categories[cat]['enhanced'].append(result['comparisons']['enhanced']['avg_score'])
            categories[cat]['advanced'].append(result['comparisons']['advanced_v2']['avg_score'])
        
        print(f"\n📈 Average Scores by Category:")
        print(f"{'Category':<15} {'Standard':<12} {'Enhanced':<12} {'Advanced v2':<12} {'v2 Improvement':<15}")
        print(f"{'-'*70}")
        
        for cat, scores in categories.items():
            std_avg = sum(scores['standard']) / len(scores['standard'])
            enh_avg = sum(scores['enhanced']) / len(scores['enhanced'])
            adv_avg = sum(scores['advanced']) / len(scores['advanced'])
            improvement = ((adv_avg - std_avg) / std_avg * 100) if std_avg > 0 else 0
            
            print(f"{cat:<15} {std_avg:<12.3f} {enh_avg:<12.3f} {adv_avg:<12.3f} +{improvement:<14.1f}%")
        
        # Overall statistics
        all_standard = [r['comparisons']['standard']['avg_score'] for r in all_results]
        all_enhanced = [r['comparisons']['enhanced']['avg_score'] for r in all_results]
        all_advanced = [r['comparisons']['advanced_v2']['avg_score'] for r in all_results]
        
        print(f"\n📊 Overall Performance:")
        print(f"   Standard RAG: {sum(all_standard)/len(all_standard):.3f}")
        print(f"   Enhanced RAG: {sum(all_enhanced)/len(all_enhanced):.3f} (+{((sum(all_enhanced)/len(all_enhanced) - sum(all_standard)/len(all_standard)) / (sum(all_standard)/len(all_standard)) * 100):.1f}%)")
        print(f"   Advanced RAG v2: {sum(all_advanced)/len(all_advanced):.3f} (+{((sum(all_advanced)/len(all_advanced) - sum(all_standard)/len(all_standard)) / (sum(all_standard)/len(all_standard)) * 100):.1f}%)")
        
        # Best improvements
        print(f"\n🏆 Top 3 Improvements (Advanced v2 vs Standard):")
        improvements = [(r['query'], r['comparisons']['advanced_v2']['improvement_over_standard']) for r in all_results]
        improvements.sort(key=lambda x: x[1], reverse=True)
        
        for i, (query, improvement) in enumerate(improvements[:3], 1):
            print(f"   {i}. {query[:60]}...")
            print(f"      Improvement: +{improvement:.1f}%")
    
    def save_results(self, all_results: List[Dict[str, Any]]):
        """Save detailed results to file."""
        output = {
            'test_date': 'August 24, 2025',
            'rag_versions_tested': ['Standard', 'Enhanced v1', 'Advanced v2'],
            'total_queries': len(all_results),
            'results': all_results,
            'summary': {
                'avg_improvement_v1_over_standard': sum(r['comparisons']['enhanced']['improvement_over_standard'] for r in all_results) / len(all_results),
                'avg_improvement_v2_over_standard': sum(r['comparisons']['advanced_v2']['improvement_over_standard'] for r in all_results) / len(all_results),
                'avg_improvement_v2_over_v1': sum(r['comparisons']['advanced_v2']['improvement_over_enhanced'] for r in all_results) / len(all_results)
            }
        }
        
        filename = f"advanced_rag_v2_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(output, f, indent=2)
        
        print(f"\n💾 Detailed results saved to: {filename}")

def main():
    """Run the comprehensive RAG comparison."""
    comparison = RAGComparison()
    comparison.run_detailed_comparison()

if __name__ == "__main__":
    main()