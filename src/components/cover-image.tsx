import cn from 'classnames'
import Link from 'next/link'

type Props = {
  title: string
  src: string
  slug?: string
}

const CoverImage = ({ title, src, slug }: Props) => {
  const image = (
    <img
      src={src}
      alt={`Cover Image for ${title}`}
      className={cn('shadow-small dark:shadow-smallDark', {
        'hover:shadow-medium dark:hover:shadow-mediumDark transition-shadow duration-200': slug,
      })}
    />
  )
  return (
    <div className={ slug ? "-mx-5 sm:mx-0" : "mx-0"}>
      {slug ? (
        <Link as={`/posts/${slug}`} href="/posts/[slug]">
          <a aria-label={title}>{image}</a>
        </Link>
      ) : (
        image
      )}
    </div>
  )
}

export default CoverImage
