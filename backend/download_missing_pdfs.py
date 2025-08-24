#!/usr/bin/env python3
"""
Download missing AI model PDFs directly
"""

import requests
import os
from pathlib import Path

# Known PDF URLs for missing models
MISSING_MODEL_PDFS = [
    # Claude documentation
    {
        "name": "Claude 3 Model Card",
        "filename": "claude_3_model_card.pdf",
        "url": "https://www-cdn.anthropic.com/de8ba9b01c9ab7cbabf5c33b80b7bbc618857627/Model_Card_Claude_3.pdf"
    },
    {
        "name": "Claude 3.5 Sonnet Addendum",
        "filename": "claude_3_5_sonnet_addendum.pdf",
        "url": "https://www-cdn.anthropic.com/fed9cc193a14b84131812372d8d5857f8f304c52/Model_Card_Claude_3_Addendum.pdf"
    },
    # Gemini documentation
    {
        "name": "Gemini 1.0 Technical Report",
        "filename": "gemini_1_0_technical_report.pdf",
        "url": "https://storage.googleapis.com/deepmind-media/gemini/gemini_1_report.pdf"
    },
    {
        "name": "Gemini 1.5 Technical Report",
        "filename": "gemini_1_5_technical_report.pdf",
        "url": "https://storage.googleapis.com/deepmind-media/gemini/gemini_v1_5_report.pdf"
    },
    # OpenAI o-series documentation
    {
        "name": "OpenAI o1 System Card",
        "filename": "openai_o1_system_card.pdf",
        "url": "https://cdn.openai.com/o1-system-card.pdf"
    }
]

def download_pdf(url, filepath, name):
    """Download a PDF file"""
    try:
        print(f"Downloading {name}...")
        response = requests.get(url, timeout=30, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        if response.status_code == 200:
            with open(filepath, 'wb') as f:
                f.write(response.content)
            size_mb = len(response.content) / (1024 * 1024)
            print(f"  ✅ Downloaded: {filepath.name} ({size_mb:.2f} MB)")
            return True
        else:
            print(f"  ❌ Failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    # Create output directory
    output_dir = Path("backend/data")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("🚀 Downloading missing AI model documentation")
    print("=" * 60)
    
    downloaded = 0
    failed = 0
    
    for pdf in MISSING_MODEL_PDFS:
        filepath = output_dir / pdf['filename']
        if filepath.exists():
            print(f"⏭️  Skipping {pdf['name']} (already exists)")
            continue
            
        if download_pdf(pdf['url'], filepath, pdf['name']):
            downloaded += 1
        else:
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"✅ Downloaded: {downloaded} PDFs")
    if failed > 0:
        print(f"❌ Failed: {failed} PDFs")
    print(f"📁 Saved to: {output_dir}")
    
    # List all PDFs in directory
    print("\n📚 All AI Model PDFs in corpus:")
    for pdf_file in sorted(output_dir.glob("*.pdf")):
        if not any(x in pdf_file.name.lower() for x in ['student', 'loan', 'pell', 'federal', 'academic']):
            size_mb = pdf_file.stat().st_size / (1024 * 1024)
            print(f"  - {pdf_file.name} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    main()