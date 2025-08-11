import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Corpus Quality Assessment Tool</title>
        <meta name="description" content="Corpus Quality Assessment Tool - AI-generated vs RAGAS-generated questions analysis" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="App">
        <header className="App-header">
          <h1>Corpus Quality Assessment Tool</h1>
        </header>
        <main className="App-main">
          <Component {...pageProps} />
        </main>
      </div>
    </>
  )
}