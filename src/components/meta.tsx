import Head from 'next/head'
import { CMS_NAME, HOME_OG_IMAGE_URL } from '../lib/constants'

const Meta = () => {
  return (
    <Head>
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicon/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon/favicon-16x16.png"
      />
      <link rel="manifest" href="/favicon/site.webmanifest" />
      <link
        rel="mask-icon"
        href="/favicon/safari-pinned-tab.svg"
        color="#000000"
      />
      <link rel="shortcut icon" href="/favicon/favicon.ico" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
      <meta name="theme-color" content="#000" />
      <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      <meta
        name="description"
        content={`Francis Luz - I'm Full-Stack software engineer.`}
      />
      <meta property="og:image" content={HOME_OG_IMAGE_URL} />
      <meta name="apple-mobile-web-app-title" content="Francis Luz"></meta>
      <meta name="apple-mobile-web-app-status-bar-style" content="default"></meta>
      {/* Splashscreen Light */}
      {/* <!-- iPhone X (1125px x 2436px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" 
        href="/splashscreens-light/apple-launch-1125x2436.png" />
      {/* <!-- iPhone 8, 7, 6s, 6 (750px x 1334px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        href="/splashscreens-light/apple-launch-750x1334.png" />
      {/* <!-- iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus (1242px x 2208px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" 
        href="/splashscreens-light/apple-launch-1242x2208.png" />
      {/* <!-- iPhone 5 (640px x 1136px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        href="/splashscreens-light/apple-launch-640x1136.png" />
      {/* <!-- iPad Mini, Air (1536px x 2048px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        href="/splashscreens-light/apple-launch-1536x2048.png" />
      {/* <!-- iPad Pro 10.5" (1668px x 2224px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        href="/splashscreens-light/apple-launch-1668x2224.png" />
      {/* <!-- iPad Pro 12.9" (2048px x 2732px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        href="/splashscreens-light/apple-launch-2048x2732.png" />
      {/* Splashscreen Dark */}
      {/* <!-- iPhone X (1125px x 2436px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" 
        href="/splashscreens-dark/apple-launch-1125x2436.png" />
      {/* <!-- iPhone 8, 7, 6s, 6 (750px x 1334px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        href="/splashscreens-dark/apple-launch-750x1334.png" />
      {/* <!-- iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus (1242px x 2208px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" 
        href="/splashscreens-dark/apple-launch-1242x2208.png" />
      {/* <!-- iPhone 5 (640px x 1136px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        href="/splashscreens-dark/apple-launch-640x1136.png" />
      {/* <!-- iPad Mini, Air (1536px x 2048px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        href="/splashscreens-dark/apple-launch-1536x2048.png" />
      {/* <!-- iPad Pro 10.5" (1668px x 2224px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        href="/splashscreens-dark/apple-launch-1668x2224.png" />
      {/* <!-- iPad Pro 12.9" (2048px x 2732px) --> */}
      <link 
        rel="apple-touch-startup-image" 
        media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        href="/splashscreens-dark/apple-launch-2048x2732.png" />
    </Head>
  )
}

export default Meta
