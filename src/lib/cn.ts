import { twMerge } from 'tailwind-merge';

export function cn(...parts: Array<string | false | undefined | null>) {
  return twMerge(parts.filter(Boolean).join(' '));
}
