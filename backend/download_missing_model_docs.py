#!/usr/bin/env python3
"""
Download missing AI model documentation using Playwright
Searches for and downloads PDFs for Claude, Gemini, and o3 models
"""

import asyncio
import os
import re
import json
from pathlib import Path
from playwright.async_api import async_playwright
import aiohttp
from urllib.parse import urljoin, urlparse

class ModelDocumentationScraper:
    def __init__(self, output_dir="backend/data/model_cards"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.results = []
        
    async def download_pdf(self, url, filename):
        """Download a PDF file"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=30) as response:
                    if response.status == 200:
                        content = await response.read()
                        filepath = self.output_dir / filename
                        filepath.write_bytes(content)
                        return True, filepath
        except Exception as e:
            print(f"Error downloading {url}: {e}")
        return False, None

    async def search_anthropic_claude_docs(self, browser):
        """Search for Claude model documentation from Anthropic"""
        print("\n🔍 Searching for Claude documentation...")
        results = []
        
        # Claude model cards and documentation pages
        claude_sources = [
            {
                "name": "Claude 3.5 Sonnet Model Card",
                "url": "https://www-cdn.anthropic.com/fed9cc193a14b84131812372d8d5857f8f304c52/Model_Card_Claude_3_Addendum.pdf",
                "model": "Claude 3.5 Sonnet"
            },
            {
                "name": "Claude 3 Model Card",
                "url": "https://www-cdn.anthropic.com/de8ba9b01c9ab7cbabf5c33b80b7bbc618857627/Model_Card_Claude_3.pdf",
                "model": "Claude 3"
            },
            {
                "name": "Constitutional AI Paper",
                "url": "https://www.anthropic.com/constitutional.pdf",
                "model": "Claude (Constitutional AI)"
            }
        ]
        
        for source in claude_sources:
            print(f"  Checking: {source['name']}...")
            success, filepath = await self.download_pdf(
                source['url'],
                f"claude_{source['model'].lower().replace(' ', '_').replace('.', '_')}.pdf"
            )
            if success:
                print(f"  ✅ Downloaded: {filepath.name}")
                results.append({
                    "model": source['model'],
                    "name": source['name'],
                    "url": source['url'],
                    "filepath": str(filepath),
                    "status": "downloaded"
                })
            else:
                # Try to fetch from web page
                try:
                    page = await browser.new_page()
                    await page.goto(source['url'].replace('.pdf', ''), wait_until='networkidle')
                    
                    # Look for PDF links on the page
                    pdf_links = await page.evaluate('''
                        () => {
                            const links = [];
                            document.querySelectorAll('a[href*=".pdf"]').forEach(a => {
                                links.push({
                                    url: a.href,
                                    text: a.textContent.trim()
                                });
                            });
                            return links;
                        }
                    ''')
                    
                    for link in pdf_links:
                        if 'claude' in link['text'].lower() or 'model' in link['text'].lower():
                            success, filepath = await self.download_pdf(link['url'], f"claude_{link['text'][:30]}.pdf")
                            if success:
                                results.append({
                                    "model": "Claude",
                                    "name": link['text'],
                                    "url": link['url'],
                                    "filepath": str(filepath),
                                    "status": "downloaded"
                                })
                    
                    await page.close()
                except Exception as e:
                    print(f"  ⚠️ Could not access: {source['url']} - {e}")
        
        return results

    async def search_google_gemini_docs(self, browser):
        """Search for Gemini model documentation from Google"""
        print("\n🔍 Searching for Gemini documentation...")
        results = []
        
        # Gemini technical reports and papers
        gemini_sources = [
            {
                "name": "Gemini Technical Report",
                "url": "https://storage.googleapis.com/deepmind-media/gemini/gemini_1_report.pdf",
                "model": "Gemini 1.0"
            },
            {
                "name": "Gemini 1.5 Technical Report",
                "url": "https://storage.googleapis.com/deepmind-media/gemini/gemini_v1_5_report.pdf",
                "model": "Gemini 1.5"
            },
            {
                "name": "Gemini Pro Technical Report",
                "url": "https://storage.googleapis.com/deepmind-media/gemini/gemini_pro_report.pdf",
                "model": "Gemini Pro"
            }
        ]
        
        for source in gemini_sources:
            print(f"  Checking: {source['name']}...")
            success, filepath = await self.download_pdf(
                source['url'],
                f"gemini_{source['model'].lower().replace(' ', '_').replace('.', '_')}.pdf"
            )
            if success:
                print(f"  ✅ Downloaded: {filepath.name}")
                results.append({
                    "model": source['model'],
                    "name": source['name'],
                    "url": source['url'],
                    "filepath": str(filepath),
                    "status": "downloaded"
                })
        
        return results

    async def search_openai_o3_docs(self, browser):
        """Search for o3 model documentation from OpenAI"""
        print("\n🔍 Searching for o3 documentation...")
        results = []
        
        # o1/o3 series documentation
        o3_sources = [
            {
                "name": "OpenAI o1 System Card",
                "url": "https://cdn.openai.com/o1-system-card.pdf",
                "model": "o1"
            },
            {
                "name": "OpenAI o1 Preview Report",
                "url": "https://cdn.openai.com/o1-preview-report.pdf",
                "model": "o1-preview"
            }
        ]
        
        # Also search OpenAI research page for o3 papers
        try:
            page = await browser.new_page()
            await page.goto("https://openai.com/research/", wait_until='networkidle')
            
            # Look for o3/o1 related papers
            pdf_links = await page.evaluate('''
                () => {
                    const links = [];
                    document.querySelectorAll('a[href*=".pdf"], a[href*="arxiv"]').forEach(a => {
                        const text = a.textContent.trim().toLowerCase();
                        if (text.includes('o1') || text.includes('o3') || text.includes('reasoning')) {
                            links.push({
                                url: a.href,
                                text: a.textContent.trim()
                            });
                        }
                    });
                    return links;
                }
            ''')
            
            for link in pdf_links[:5]:  # Limit to first 5 relevant links
                o3_sources.append({
                    "name": link['text'],
                    "url": link['url'],
                    "model": "o-series"
                })
            
            await page.close()
        except Exception as e:
            print(f"  ⚠️ Could not search OpenAI research page: {e}")
        
        for source in o3_sources:
            print(f"  Checking: {source['name']}...")
            success, filepath = await self.download_pdf(
                source['url'],
                f"o3_{source['model'].lower().replace(' ', '_').replace('-', '_')}.pdf"
            )
            if success:
                print(f"  ✅ Downloaded: {filepath.name}")
                results.append({
                    "model": source['model'],
                    "name": source['name'],
                    "url": source['url'],
                    "filepath": str(filepath),
                    "status": "downloaded"
                })
        
        return results

    async def search_arxiv_papers(self, browser, model_names):
        """Search arXiv for relevant model papers"""
        print("\n🔍 Searching arXiv for model papers...")
        results = []
        
        for model in model_names:
            try:
                page = await browser.new_page()
                search_url = f"https://arxiv.org/search/?query={model.replace(' ', '+')}&searchtype=all"
                await page.goto(search_url, wait_until='networkidle')
                
                # Get PDF links from search results
                papers = await page.evaluate('''
                    () => {
                        const papers = [];
                        document.querySelectorAll('.arxiv-result').forEach((result, i) => {
                            if (i < 3) {  // Top 3 results only
                                const title = result.querySelector('.title')?.textContent.trim();
                                const pdfLink = result.querySelector('a[href*="/pdf/"]')?.href;
                                if (title && pdfLink) {
                                    papers.push({
                                        title: title,
                                        url: pdfLink
                                    });
                                }
                            }
                        });
                        return papers;
                    }
                ''')
                
                for paper in papers:
                    filename = f"arxiv_{model.lower().replace(' ', '_')}_{paper['title'][:30].replace(' ', '_')}.pdf"
                    success, filepath = await self.download_pdf(paper['url'], filename)
                    if success:
                        print(f"  ✅ Downloaded arXiv paper: {paper['title'][:50]}...")
                        results.append({
                            "model": model,
                            "name": f"arXiv: {paper['title']}",
                            "url": paper['url'],
                            "filepath": str(filepath),
                            "status": "downloaded"
                        })
                
                await page.close()
            except Exception as e:
                print(f"  ⚠️ Could not search arXiv for {model}: {e}")
        
        return results

    async def run(self):
        """Main scraping function"""
        print("🚀 Starting AI Model Documentation Scraper")
        print("=" * 60)
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            # Search for Claude documentation
            claude_results = await self.search_anthropic_claude_docs(browser)
            self.results.extend(claude_results)
            
            # Search for Gemini documentation
            gemini_results = await self.search_google_gemini_docs(browser)
            self.results.extend(gemini_results)
            
            # Search for o3 documentation
            o3_results = await self.search_openai_o3_docs(browser)
            self.results.extend(o3_results)
            
            # Search arXiv for additional papers
            arxiv_results = await self.search_arxiv_papers(
                browser, 
                ["Claude 3", "Gemini 2", "OpenAI o3", "OpenAI o1"]
            )
            self.results.extend(arxiv_results)
            
            await browser.close()
        
        # Save results summary
        summary = {
            "total_documents": len(self.results),
            "downloaded": len([r for r in self.results if r['status'] == 'downloaded']),
            "models_covered": list(set(r['model'] for r in self.results)),
            "documents": self.results
        }
        
        summary_path = self.output_dir / "missing_models_download_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        print("\n" + "=" * 60)
        print(f"✅ Scraping complete!")
        print(f"📊 Downloaded {summary['downloaded']} documents")
        print(f"📁 Saved to: {self.output_dir}")
        print(f"📋 Summary: {summary_path}")
        
        return summary

async def main():
    scraper = ModelDocumentationScraper()
    results = await scraper.run()
    
    # Copy PDFs to backend/data for indexing
    import shutil
    data_dir = Path("backend/data")
    for doc in results['documents']:
        if doc['status'] == 'downloaded':
            src = Path(doc['filepath'])
            dst = data_dir / src.name
            try:
                shutil.copy2(src, dst)
                print(f"📦 Copied {src.name} to {dst}")
            except Exception as e:
                print(f"⚠️ Could not copy {src.name}: {e}")

if __name__ == "__main__":
    asyncio.run(main())