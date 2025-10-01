import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>RagCheck - Validate your RAG before you build</title>
        <meta name="description" content="RagCheck - Validate your RAG before you build (pre-retrieval) | Save on expensive evaluation time and costs) | As goes retrieval, so goes generation!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="App">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <header className="App-header">
          <h1>🔍 RagCheck</h1>
          <p style={{ 
            fontSize: '16px', 
            fontStyle: 'italic', 
            margin: '8px 0 0 0',
            fontWeight: 'normal'
          }}>
            <span className="tagline-validate">Validate your RAG before you build (pre-retrieval checks)</span> | <span className="tagline-save">Save on expensive evaluation time and costs</span> | <span className="tagline-generate">As goes retrieval, so goes generation!</span>
          </p>
        </header>
        <main className="App-main" id="main-content">
          <Component {...pageProps} />
        </main>
      </div>
    </>
  )
}