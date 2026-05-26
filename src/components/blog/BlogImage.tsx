import Image from 'next/image';
import { cn } from '@/lib/cn';

type BlogImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
  fill?: boolean;
};

export function BlogImage({
  src,
  alt,
  priority = false,
  className,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = true,
}: BlogImageProps) {
  const isRemote = src.startsWith('http');

  if (isRemote) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        priority={priority}
        sizes={sizes}
        className={cn('object-cover', className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={cn('object-cover', className)}
    />
  );
}
