import { redirect } from 'next/navigation';

type Search = { [key: string]: string | string[] | undefined };

/** Old workspace URL — default entry is the presentation library. Preserves query string (e.g. legacy links). */
export default function DashboardRedirectPage({ searchParams }: { searchParams: Search }) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else qs.set(key, value);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  redirect(`/my-presentations${suffix}`);
}
