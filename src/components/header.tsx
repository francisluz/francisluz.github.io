import Link from 'next/link'

const Header = () => {
  return (
    <h2 className="text-3xl md:text-4xl font-bold tracking-tight md:tracking-tighter leading-tight mb-20 mt-8">
      <Link href="/">
        <a className="hover:underline">
          <img src="/images/left-arrow-back-dark.svg" alt="logo" className="w-6 my-1 md:my-2 float-left block lg:hidden light:hidden" />
          <img src="/images/left-arrow-back.svg" alt="logo" className="w-6 my-3 pr-1 md:my-2 float-left block lg:hidden dark:hidden" />
          <img src="/images/logo-dark.svg" alt="logo" className="w-8 md:w-10 float-left hidden dark:block" />
          <img src="/images/logo.svg" alt="logo" className="w-8 md:w-10 float-left dark:hidden" />
          <span className="pl-2">Francis Luz</span>
        </a>
      </Link>
    </h2>
  )
}

export default Header
