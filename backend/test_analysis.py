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
        # Import the services we need to test
        from services.quality_score_service import QualityScoreService
        from services.experiment_service import ExperimentService
        
        # Test quality score transformation
        print("📊 Testing quality score transformation...")
        assert QualityScoreService.similarity_to_quality_score(0.8) == 8.0
        assert QualityScoreService.similarity_to_quality_score(0.65) == 6.5
        assert QualityScoreService.similarity_to_quality_score(0.5) == 5.0
        print("✅ Quality score transformation tests passed")
        
        # Test quality status
        print("📊 Testing quality status...")
        assert QualityScoreService.get_quality_status(8.0) == "good"
        assert QualityScoreService.get_quality_status(6.0) == "weak"
        assert QualityScoreService.get_quality_status(4.0) == "poor"
        print("✅ Quality status tests passed")
        
        # Test conversion
        print("🔄 Testing result conversion...")
        experiment_service = ExperimentService()
        converted = experiment_service.convert_experiment_results_to_analysis(mock_experiment_results)
        assert len(converted) == 2
        assert converted[0]["id"] == "llm_q_001"
        assert converted[0]["status"] == "good"
        assert converted[0]["quality_score"] == 7.5  # 0.75 -> 7.5
        assert converted[1]["source"] == "ragas"
        assert converted[1]["quality_score"] == 6.5  # 0.65 -> 6.5
        print("✅ Conversion tests passed")
        
        # Test metrics calculation
        print("📈 Testing metrics calculation...")
        overall = experiment_service.calculate_overall_metrics(converted)
        assert overall["total_questions"] == 2
        assert overall["avg_quality_score"] > 0
        print("✅ Overall metrics tests passed")
        
        per_group = experiment_service.calculate_per_role_metrics(converted)
        assert "llm" in per_group
        assert "ragas" in per_group
        print("✅ Per-group metrics tests passed")
        
        # Test full analysis response
        print("🏗️ Testing full analysis response...")
        response = experiment_service.build_analysis_response(converted)
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
