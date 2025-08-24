#!/usr/bin/env python3
"""
Enhanced PDF downloader for AI Model Cards
Downloads both direct PDFs and extracts PDFs from web pages using Playwright
"""

import asyncio
import os
import re
from pathlib import Path
from playwright.async_api import async_playwright
import aiohttp
import json
from typing import List, Dict, Optional
import hashlib

# All model documentation sources from the AI Model Cards Viewer
MODEL_SOURCES = [
    # Direct PDF downloads
    {
        "name": "GPT-5 System Card",
        "model": "GPT-5",
        "provider": "OpenAI",
        "type": "pdf",
        "url": "https://cdn.openai.com/gpt-5-system-card.pdf"
    },
    {
        "name": "Grok 4 Model Card",
        "model": "Grok 4",
        "provider": "xAI",
        "type": "pdf",
        "url": "https://data.x.ai/2025-08-20-grok-4-model-card.pdf"
    },
    {
        "name": "GPT-OSS Model Card",
        "model": "GPT-OSS-120B/20B",
        "provider": "OpenAI",
        "type": "pdf",
        "url": "https://cdn.openai.com/pdf/419b6906-9da6-406c-a19d-1bb078ac7637/oai_gpt-oss_model_card.pdf"
    },
    
    # Web pages that may contain PDFs or need to be converted
    {
        "name": "o3-preview Documentation",
        "model": "o3-preview",
        "provider": "OpenAI",
        "type": "webpage",
        "url": "https://openai.com/index/introducing-o3-and-o4-mini/"
    },
    {
        "name": "Gemini 2.5 Pro Documentation",
        "model": "Gemini 2.5 Pro 06-05",
        "provider": "Google",
        "type": "webpage",
        "url": "https://storage.googleapis.com/deepmind-media/gemini/gemini_2_5_pro_model_card.pdf",
        "fallback": "https://deepmind.google/models/gemini/pro/"
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
    
    # HuggingFace model cards
    {
        "name": "DeepSeek-V3.1 Model Card",
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
    },
    
    # Additional research papers and documentation
    {
        "name": "GPT-OSS ArXiv Paper",
        "model": "GPT-OSS",
        "provider": "OpenAI",
        "type": "arxiv",
        "url": "https://arxiv.org/pdf/2508.10925.pdf"
    },
    {
        "name": "GPT-OSS Evaluation Paper",
        "model": "GPT-OSS",
        "provider": "Third-party",
        "type": "arxiv",
        "url": "https://arxiv.org/pdf/2508.12461.pdf"
    }
]

# Output directory
OUTPUT_DIR = Path(__file__).parent / "data" / "model_cards"

def sanitize_filename(name: str) -> str:
    """Create a safe filename from model name"""
    # Remove special characters and replace spaces
    safe_name = re.sub(r'[^\w\s-]', '', name)
    safe_name = re.sub(r'[-\s]+', '_', safe_name)
    return safe_name.lower()

async def download_direct_pdf(source: Dict, session: aiohttp.ClientSession) -> Optional[Path]:
    """Download a PDF file directly"""
    try:
        filename = f"{sanitize_filename(source['model'])}_{sanitize_filename(source['name'])}.pdf"
        output_path = OUTPUT_DIR / filename
        
        if output_path.exists():
            print(f"  ✅ Already exists: {filename}")
            return output_path
        
        async with session.get(source['url']) as response:
            if response.status == 200:
                content = await response.read()
                with open(output_path, 'wb') as f:
                    f.write(content)
                size_mb = len(content) / (1024 * 1024)
                print(f"  ✅ Downloaded: {filename} ({size_mb:.2f} MB)")
                return output_path
            else:
                print(f"  ❌ HTTP {response.status} for {source['url']}")
                return None
    except Exception as e:
        print(f"  ❌ Error downloading {source['name']}: {e}")
        return None

async def extract_pdf_from_webpage(source: Dict, browser) -> Optional[Path]:
    """Extract PDF links from web pages using Playwright"""
    try:
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = await context.new_page()
        
        print(f"  🔍 Scanning webpage: {source['url']}")
        await page.goto(source['url'], wait_until='networkidle', timeout=30000)
        
        # Look for PDF links on the page
        pdf_links = await page.evaluate("""
            () => {
                const links = Array.from(document.querySelectorAll('a[href*=".pdf"], a[href*="pdf"]'));
                return links.map(link => ({
                    href: link.href,
                    text: link.textContent.trim()
                })).filter(link => link.href.includes('.pdf'));
            }
        """)
        
        if pdf_links:
            print(f"  📄 Found {len(pdf_links)} PDF link(s)")
            # Download the first relevant PDF
            for pdf_link in pdf_links:
                if any(keyword in pdf_link['href'].lower() for keyword in ['model', 'card', 'system', 'technical']):
                    filename = f"{sanitize_filename(source['model'])}_{sanitize_filename(source['name'])}.pdf"
                    output_path = OUTPUT_DIR / filename
                    
                    if not output_path.exists():
                        async with page.expect_download() as download_info:
                            await page.goto(pdf_link['href'])
                            download = await download_info.value
                            await download.save_as(output_path)
                        print(f"  ✅ Extracted PDF: {filename}")
                        await context.close()
                        return output_path
        
        # If no PDF found, save the page as PDF
        filename = f"{sanitize_filename(source['model'])}_{sanitize_filename(source['name'])}_webpage.pdf"
        output_path = OUTPUT_DIR / filename
        
        if not output_path.exists():
            await page.pdf(path=str(output_path), format='A4')
            print(f"  📄 Saved webpage as PDF: {filename}")
        
        await context.close()
        return output_path
        
    except Exception as e:
        print(f"  ❌ Error processing webpage {source['name']}: {e}")
        return None

async def process_huggingface(source: Dict, browser) -> Optional[Path]:
    """Extract model card from HuggingFace"""
    try:
        context = await browser.new_context()
        page = await context.new_page()
        
        print(f"  🤗 Processing HuggingFace: {source['url']}")
        await page.goto(source['url'], wait_until='networkidle', timeout=30000)
        
        # Look for README or model card content
        await page.wait_for_selector('.prose', timeout=5000)
        
        filename = f"{sanitize_filename(source['model'])}_{sanitize_filename(source['name'])}.pdf"
        output_path = OUTPUT_DIR / filename
        
        if not output_path.exists():
            # Save the model card as PDF
            await page.pdf(
                path=str(output_path),
                format='A4',
                print_background=True,
                margin={'top': '1cm', 'bottom': '1cm', 'left': '1cm', 'right': '1cm'}
            )
            print(f"  ✅ Saved HuggingFace model card: {filename}")
        else:
            print(f"  ✅ Already exists: {filename}")
        
        await context.close()
        return output_path
        
    except Exception as e:
        print(f"  ❌ Error processing HuggingFace {source['name']}: {e}")
        return None

async def download_all_pdfs():
    """Main function to download all model PDFs"""
    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print(f"📥 Processing {len(MODEL_SOURCES)} model documentation sources...\n")
    
    results = []
    
    # Set up aiohttp session for direct downloads
    async with aiohttp.ClientSession() as session:
        # Set up Playwright for complex extractions
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            for i, source in enumerate(MODEL_SOURCES, 1):
                print(f"[{i}/{len(MODEL_SOURCES)}] {source['name']} ({source['provider']})")
                
                result = {
                    "name": source['name'],
                    "model": source['model'],
                    "provider": source['provider'],
                    "type": source['type']
                }
                
                try:
                    if source['type'] in ['pdf', 'arxiv']:
                        # Direct PDF download
                        path = await download_direct_pdf(source, session)
                        result['status'] = 'success' if path else 'failed'
                        result['path'] = str(path) if path else None
                        
                    elif source['type'] == 'webpage':
                        # Extract from webpage
                        # Try direct PDF first if URL looks like a PDF
                        if '.pdf' in source['url']:
                            path = await download_direct_pdf(source, session)
                        else:
                            path = await extract_pdf_from_webpage(source, browser)
                        result['status'] = 'success' if path else 'failed'
                        result['path'] = str(path) if path else None
                        
                    elif source['type'] == 'huggingface':
                        # Process HuggingFace model card
                        path = await process_huggingface(source, browser)
                        result['status'] = 'success' if path else 'failed'
                        result['path'] = str(path) if path else None
                    
                    else:
                        result['status'] = 'skipped'
                        result['reason'] = f"Unknown type: {source['type']}"
                        
                except Exception as e:
                    result['status'] = 'error'
                    result['error'] = str(e)
                
                results.append(result)
                print()
            
            await browser.close()
    
    # Summary
    print("=" * 60)
    print("📊 Download Summary:")
    successful = sum(1 for r in results if r['status'] == 'success')
    failed = sum(1 for r in results if r['status'] in ['failed', 'error'])
    skipped = sum(1 for r in results if r['status'] == 'skipped')
    
    print(f"  ✅ Successful: {successful}/{len(MODEL_SOURCES)}")
    print(f"  ❌ Failed: {failed}/{len(MODEL_SOURCES)}")
    print(f"  ⏭️  Skipped: {skipped}/{len(MODEL_SOURCES)}")
    
    # Group results by provider
    print("\n📦 Downloaded Models by Provider:")
    providers = {}
    for r in results:
        if r['status'] == 'success':
            provider = r['provider']
            if provider not in providers:
                providers[provider] = []
            providers[provider].append(r['model'])
    
    for provider, models in sorted(providers.items()):
        unique_models = list(set(models))
        print(f"  • {provider}: {', '.join(unique_models)}")
    
    # Save results to JSON
    results_file = OUTPUT_DIR / "download_summary.json"
    with open(results_file, 'w') as f:
        json.dump({
            'timestamp': asyncio.get_event_loop().time(),
            'total_sources': len(MODEL_SOURCES),
            'successful': successful,
            'failed': failed,
            'results': results
        }, f, indent=2)
    print(f"\n📄 Summary saved to: {results_file}")
    
    # List all downloaded files
    pdf_files = list(OUTPUT_DIR.glob("*.pdf"))
    print(f"\n📚 Total PDF files in directory: {len(pdf_files)}")
    
    return results

async def main():
    """Main entry point"""
    try:
        results = await download_all_pdfs()
        return results
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        return []

if __name__ == "__main__":
    asyncio.run(main())