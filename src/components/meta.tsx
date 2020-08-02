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
      {/*iOS Splashscreen Light */}
      <link 
        href="splashscreens-light/iphone5_splash.png" 
        media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/iphone6_splash.png" 
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/iphoneplus_splash.png" 
        media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/iphonex_splash.png" 
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/iphonexr_splash.png" 
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/iphonexsmax_splash.png" 
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/ipad_splash.png" 
        media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/ipadpro1_splash.png" 
        media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/ipadpro3_splash.png" 
        media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-light/ipadpro2_splash.png" 
        media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: light)" 
        rel="apple-touch-startup-image" />
      {/*iOS Splashscreen Dark */}
      <link 
        href="splashscreens-dark/iphone5_splash.png" 
        media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/iphone6_splash.png" 
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/iphoneplus_splash.png" 
        media="(device-width: 621px) and (device-height: 1104px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/iphonex_splash.png" 
        media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/iphonexr_splash.png" 
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/iphonexsmax_splash.png" 
        media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/ipad_splash.png" 
        media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/ipadpro1_splash.png" 
        media="(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/ipadpro3_splash.png" 
        media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
      <link 
        href="splashscreens-dark/ipadpro2_splash.png" 
        media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (prefers-color-scheme: dark)" 
        rel="apple-touch-startup-image" />
        
    </Head>
  )
}

export default Meta
