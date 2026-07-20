import PortableTextBody from '@/components/PortableTextBody'
import { safeFetch, INTERVIEW_QUERY } from '@/lib/queries'
export const dynamic = 'force-dynamic'
export default async function InterviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const iv = await safeFetch<any>(INTERVIEW_QUERY, { slug }, null)
  if (!iv) return <p className="text-neutral-500">Not found.</p>
  return (
    <article className="space-y-6">
      <header><h1 className="text-3xl font-black uppercase tracking-tight">{iv.title}</h1>
        <p className="text-xs uppercase tracking-wide text-lime-400">{iv.interviewerName} interviews {iv.subjectName}</p></header>
      <PortableTextBody value={iv.body} />
    </article>
  )
}
