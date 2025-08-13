#!/usr/bin/env python3
"""
Test script to verify analysis functionality.
"""

import sys
import os
import json
sys.path.append(os.path.dirname(__file__))

# Mock experiment results for testing
mock_experiment_results = [
    {
        "question_id": "llm_q_001",
        "question": "How much can I borrow for my degree program?",
        "source": "llm",
        "avg_similarity": 0.75,
        "retrieved_docs": [
            {"doc_id": "doc_1", "similarity": 0.8, "title": "Student Loan Limits"},
            {"doc_id": "doc_2", "similarity": 0.7, "title": "Borrowing Guidelines"}
        ]
    },
    {
        "question_id": "ragas_q_001", 
        "question": "What is the issue with Aidvantage in the borrower's complaint?",
        "source": "ragas",
        "avg_similarity": 0.65,
        "retrieved_docs": [
            {"doc_id": "doc_3", "similarity": 0.7, "title": "Servicer Complaints"},
            {"doc_id": "doc_4", "similarity": 0.6, "title": "Aidvantage Issues"}
        ]
    }
]

def test_analysis_functions():
    """Test the analysis functions."""
    print("🧪 Testing analysis functions...")
    
    try:
        # Import the functions we need to test
        from main import convert_experiment_results_to_analysis, get_similarity_status, calculate_overall_metrics, calculate_per_group_metrics, build_analysis_response
        
        # Test similarity status
        print("📊 Testing similarity status...")
        assert get_similarity_status(0.8) == "good"
        assert get_similarity_status(0.6) == "weak"
        assert get_similarity_status(0.4) == "poor"
        print("✅ Similarity status tests passed")
        
        # Test conversion
        print("🔄 Testing result conversion...")
        converted = convert_experiment_results_to_analysis(mock_experiment_results)
        assert len(converted) == 2
        assert converted[0]["id"] == "llm_q_001"
        assert converted[0]["status"] == "good"
        assert converted[1]["source"] == "ragas"
        print("✅ Conversion tests passed")
        
        # Test metrics calculation
        print("📈 Testing metrics calculation...")
        overall = calculate_overall_metrics(converted)
        assert overall["total_questions"] == 2
        assert overall["avg_similarity"] > 0
        print("✅ Overall metrics tests passed")
        
        per_group = calculate_per_group_metrics(converted)
        assert "llm" in per_group
        assert "ragas" in per_group
        print("✅ Per-group metrics tests passed")
        
        # Test full analysis response
        print("🏗️ Testing full analysis response...")
        response = build_analysis_response(converted)
        assert "overall" in response
        assert "per_group" in response
        assert "per_question" in response
        print("✅ Full analysis response tests passed")
        
        print("🎉 All analysis tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_analysis_functions()
    sys.exit(0 if success else 1)
