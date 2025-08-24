#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test script to validate enhanced RAG improvements
"""

import asyncio
import json
from managers.search_manager import SearchManager
from managers.enhanced_rag_manager import EnhancedRAGManager
from managers.qdrant_manager import QdrantManager
from managers.data_manager import DataManager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_enhanced_rag():
    """Test enhanced RAG retrieval with sample queries."""
    
    # Initialize managers
    qdrant_manager = QdrantManager(collection_name="student_loan_corpus")
    data_manager = DataManager(data_folder=os.getenv("DATA_FOLDER"))
    search_manager = SearchManager(data_manager, qdrant_manager)
    enhanced_rag_manager = EnhancedRAGManager(search_manager)
    
    # Test queries - AI model specific
    test_queries = [
        "What is GPT-5's performance on the GPQA benchmark?",
        "How does Claude 3 Opus compare to GPT-4 on reasoning tasks?",
        "Which model has the best context window size?",
        "What are the safety measures in Anthropic's Claude?",
        "Can GPT-OSS run on consumer hardware?",
        "What is the architecture of Gemini 2.5?",
        "Which models support multimodal inputs?",
        "What's the cost comparison between different AI models?"
    ]
    
    print("🚀 Testing Enhanced RAG Retrieval\n")
    print("=" * 80)
    
    results_comparison = []
    
    for query in test_queries:
        print(f"\n📝 Query: {query}")
        print("-" * 60)
        
        # Standard retrieval
        standard_results = search_manager.vector_search(query, top_k=5)
        standard_avg = sum(r.get('similarity', 0) for r in standard_results) / len(standard_results) if standard_results else 0
        
        # Enhanced retrieval
        enhanced_results, enhanced_avg = enhanced_rag_manager.enhanced_retrieve(query, top_k=5)
        
        # Quality analysis
        quality_analysis = enhanced_rag_manager.analyze_retrieval_quality(query, enhanced_results)
        
        # Compare results
        print(f"\n📊 Standard RAG:")
        print(f"   - Avg Score: {standard_avg:.3f}")
        print(f"   - Docs Found: {len(standard_results)}")
        if standard_results:
            print(f"   - Top Result: {standard_results[0].get('title', 'Unknown')[:50]}...")
        
        print(f"\n🎯 Enhanced RAG:")
        print(f"   - Avg Score: {enhanced_avg:.3f}")
        print(f"   - Docs Found: {len(enhanced_results)}")
        print(f"   - Quality: {quality_analysis['quality']}")
        if enhanced_results:
            print(f"   - Top Result: {enhanced_results[0].get('title', 'Unknown')[:50]}...")
        
        # Calculate improvement
        improvement = ((enhanced_avg - standard_avg) / standard_avg * 100) if standard_avg > 0 else 0
        print(f"\n✨ Improvement: {improvement:+.1f}%")
        
        results_comparison.append({
            'query': query,
            'standard_score': standard_avg,
            'enhanced_score': enhanced_avg,
            'improvement_percent': improvement,
            'quality': quality_analysis['quality']
        })
    
    # Summary statistics
    print("\n" + "=" * 80)
    print("📈 SUMMARY STATISTICS")
    print("=" * 80)
    
    avg_standard = sum(r['standard_score'] for r in results_comparison) / len(results_comparison)
    avg_enhanced = sum(r['enhanced_score'] for r in results_comparison) / len(results_comparison)
    avg_improvement = sum(r['improvement_percent'] for r in results_comparison) / len(results_comparison)
    
    print(f"\n📊 Average Scores:")
    print(f"   - Standard RAG: {avg_standard:.3f}")
    print(f"   - Enhanced RAG: {avg_enhanced:.3f}")
    print(f"   - Overall Improvement: {avg_improvement:+.1f}%")
    
    print(f"\n🎯 Quality Distribution:")
    quality_counts = {}
    for r in results_comparison:
        quality = r['quality']
        quality_counts[quality] = quality_counts.get(quality, 0) + 1
    
    for quality, count in quality_counts.items():
        percentage = (count / len(results_comparison)) * 100
        print(f"   - {quality.upper()}: {count} queries ({percentage:.0f}%)")
    
    # Save results for analysis
    output_file = "enhanced_rag_test_results.json"
    with open(output_file, 'w') as f:
        json.dump({
            'test_queries': test_queries,
            'results': results_comparison,
            'summary': {
                'avg_standard_score': avg_standard,
                'avg_enhanced_score': avg_enhanced,
                'avg_improvement_percent': avg_improvement,
                'quality_distribution': quality_counts
            }
        }, f, indent=2)
    
    print(f"\n💾 Results saved to {output_file}")
    print("\n✅ Enhanced RAG testing complete!")

if __name__ == "__main__":
    asyncio.run(test_enhanced_rag())