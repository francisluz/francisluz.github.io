import Link from 'next/link'

const Header = () => {
  return (
    <h2 className="text-3xl md:text-4xl font-bold tracking-tight md:tracking-tighter leading-tight mb-20 mt-8">
      <Link href="/">
        <a className="hover:underline">
          <img src="/images/logo.svg" alt="logo" className="w-8 md:w-10 float-left" />
          <span className="pl-2">Francis Luz</span>
        </a>
      </Link>
    </h2>
  )
}

export default Header
