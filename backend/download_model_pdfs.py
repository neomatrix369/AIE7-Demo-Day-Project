#!/usr/bin/env python3
"""
Download AI Model PDFs using Playwright
Extracts model PDFs from the model viewer data and downloads them to backend/data/model_cards/
"""

import asyncio
import os
import re
from pathlib import Path
from playwright.async_api import async_playwright
import aiohttp
import json

# PDF URLs extracted from models.js - All available PDFs from the AI Model Cards Viewer
MODEL_PDFS = [
    {
        "name": "GPT-5 System Card",
        "model": "GPT-5",
        "provider": "OpenAI",
        "url": "https://cdn.openai.com/gpt-5-system-card.pdf"
    },
    {
        "name": "Grok 4 Model Card",
        "model": "Grok 4",
        "provider": "xAI",
        "url": "https://data.x.ai/2025-08-20-grok-4-model-card.pdf"
    },
    {
        "name": "GPT-OSS Model Card (120B & 20B)",
        "model": "GPT-OSS-120B/20B",
        "provider": "OpenAI",
        "url": "https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf"
    }
]

# Additional URLs that might have PDFs (from web pages that could contain PDF links)
ADDITIONAL_SOURCES = [
    {
        "name": "o3-preview Documentation",
        "model": "o3-preview",
        "provider": "OpenAI",
        "type": "webpage",
        "url": "https://openai.com/index/introducing-o3-and-o4-mini/"
    },
    {
        "name": "Gemini 2.5 Pro Documentation",
        "model": "Gemini 2.5 Pro",
        "provider": "Google",
        "type": "webpage",
        "url": "https://deepmind.google/models/gemini/pro/"
    },
    {
        "name": "Claude 3.7 Sonnet System Card",
        "model": "Claude 3.7 Sonnet",
        "provider": "Anthropic",
        "type": "webpage",
        "url": "https://www.anthropic.com/claude-3-7-sonnet-system-card"
    },
    {
        "name": "Claude Opus 4 System Card",
        "model": "Claude Opus 4",
        "provider": "Anthropic",
        "type": "webpage",
        "url": "https://www.anthropic.com/claude-4-system-card"
    },
    {
        "name": "DeepSeek-V3.1-Base Model Card",
        "model": "DeepSeek-V3.1-Base",
        "provider": "DeepSeek",
        "type": "huggingface",
        "url": "https://huggingface.co/deepseek-ai/DeepSeek-V3.1-Base"
    },
    {
        "name": "Qwen3-235B Model Card",
        "model": "Qwen3-235B-A22B",
        "provider": "Alibaba",
        "type": "huggingface",
        "url": "https://huggingface.co/Qwen/Qwen3-235B-A22B"
    }
]

# Output directory
OUTPUT_DIR = Path(__file__).parent / "data" / "model_cards"

async def download_pdf_with_aiohttp(url: str, output_path: Path) -> bool:
    """Download PDF using aiohttp (for direct URLs)"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    content = await response.read()
                    with open(output_path, 'wb') as f:
                        f.write(content)
                    return True
                else:
                    print(f"  ❌ HTTP {response.status} for {url}")
                    return False
    except Exception as e:
        print(f"  ❌ Error with aiohttp: {e}")
        return False

async def download_pdf_with_playwright(url: str, output_path: Path) -> bool:
    """Download PDF using Playwright (for complex cases)"""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                accept_downloads=True,
                user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            )
            page = await context.new_page()
            
            # Navigate to the URL
            await page.goto(url, wait_until='networkidle', timeout=30000)
            
            # For PDFs served directly, save the response
            async with page.expect_download() as download_info:
                # Trigger download by navigating to the PDF
                await page.evaluate(f'window.location.href = "{url}"')
                download = await download_info.value
                
                # Save to our desired location
                await download.save_as(output_path)
            
            await browser.close()
            return True
            
    except Exception as e:
        print(f"  ❌ Error with Playwright: {e}")
        return False

async def download_all_pdfs():
    """Download all model PDFs"""
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"📁 Creating directory: {OUTPUT_DIR}")
    print(f"📥 Downloading {len(MODEL_PDFS)} model PDFs...\n")
    
    results = []
    
    for i, pdf_info in enumerate(MODEL_PDFS, 1):
        name = pdf_info["name"]
        url = pdf_info["url"]
        
        # Create filename from name
        filename = name.lower().replace(" ", "_") + ".pdf"
        output_path = OUTPUT_DIR / filename
        
        print(f"[{i}/{len(MODEL_PDFS)}] Downloading: {name}")
        print(f"  📎 URL: {url}")
        print(f"  💾 Save as: {output_path.name}")
        
        # Skip if already exists
        if output_path.exists():
            print(f"  ✅ Already exists, skipping")
            results.append({"name": name, "status": "exists", "path": str(output_path)})
            continue
        
        # Try direct download first
        success = await download_pdf_with_aiohttp(url, output_path)
        
        # If direct download fails, try with Playwright
        if not success:
            print(f"  🔄 Trying with Playwright...")
            success = await download_pdf_with_playwright(url, output_path)
        
        if success:
            file_size = output_path.stat().st_size / (1024 * 1024)  # MB
            print(f"  ✅ Downloaded successfully ({file_size:.2f} MB)")
            results.append({"name": name, "status": "success", "path": str(output_path), "size_mb": file_size})
        else:
            print(f"  ❌ Failed to download")
            results.append({"name": name, "status": "failed", "url": url})
        
        print()
    
    # Summary
    print("=" * 60)
    print("📊 Download Summary:")
    successful = sum(1 for r in results if r["status"] in ["success", "exists"])
    failed = sum(1 for r in results if r["status"] == "failed")
    print(f"  ✅ Successful: {successful}/{len(MODEL_PDFS)}")
    print(f"  ❌ Failed: {failed}/{len(MODEL_PDFS)}")
    
    if failed > 0:
        print("\n❌ Failed downloads:")
        for r in results:
            if r["status"] == "failed":
                print(f"  - {r['name']}: {r['url']}")
    
    # Save results to JSON
    results_file = OUTPUT_DIR / "download_results.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n📄 Results saved to: {results_file}")
    
    return results

async def main():
    """Main function"""
    try:
        results = await download_all_pdfs()
        return results
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        return []

if __name__ == "__main__":
    asyncio.run(main())