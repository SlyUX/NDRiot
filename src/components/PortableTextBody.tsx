import { PortableText } from '@portabletext/react'
export default function PortableTextBody({ value }: { value: any }) {
  if (!value) return null
  return <div className="prose prose-invert max-w-none"><PortableText value={value} /></div>
}
