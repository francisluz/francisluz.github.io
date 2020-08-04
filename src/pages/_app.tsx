import { AppProps } from 'next/app'
import '../styles/index.css'
import 'highlight.js/styles/hybrid.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
