import { CMS_NAME } from '../lib/constants'

const Intro = () => {
  return (
    <section className="flex-col md:flex-row flex items-center md:justify-between mt-16 mb-16 md:mb-12">
      <h1 className="text-6xl md:text-7xl font-bold tracking-tighter leading-tight md:pr-8">
        <img src="/images/logo-dark.svg" alt="logo" className="w-12 md:w-20 float-left hidden dark:block" />
        <img src="/images/logo.svg" alt="logo" className="w-12 md:w-20 float-left dark:hidden" />
        <span className="pl-2">Francis Luz</span>
      </h1>
      <h4 className="text-center md:text-left text-lg mt-5 md:pl-8">
        I'm a Full-Stack software engineer.
        {/* A statically generated blog example using{' '}
        <a
          href="https://nextjs.org/"
          className="underline hover:text-success duration-200 transition-colors"
        >
          Next.js
        </a>{' '}
        and {CMS_NAME}. */}
      </h4>
    </section>
  )
}

export default Intro
