import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>RagCheck - Validate your RAG before you build</title>
        <meta name="description" content="RagCheck - Validate your RAG before you build (pre-retrieval) | Save on expensive evaluation time and costs) | As retrieved, so generated!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="App">
        <header className="App-header">
          <h1>🔍 RagCheck</h1>
          <p style={{ 
            fontSize: '16px', 
            fontStyle: 'italic', 
            color: '#FD0', 
            margin: '8px 0 0 0',
            fontWeight: 'normal'
          }}>
            Validate your RAG before you build (pre-retrieval checks) | Save on expensive evaluation time and costs | As retrieved, so generated!
          </p>
        </header>
        <main className="App-main">
          <Component {...pageProps} />
        </main>
      </div>
    </>
  )
}