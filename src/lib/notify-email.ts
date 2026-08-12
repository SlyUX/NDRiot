import 'server-only'

/**
 * One place to send a transactional email (Resend) and to fill the tokens in the
 * CMS-managed bodies. Env-gated and fail-soft: a missing key or a Resend hiccup
 * logs and returns false — it never throws into a webhook, cron, or form action.
 */

const DEFAULT_REPLY_TO = 'submission@ndriot.com'

/** Replace `{token}` placeholders; an unknown token is left as-is. */
export function fillTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => tokens[key] ?? whole)
}

export async function sendEmail(input: {
  to: string
  subject: string
  text: string
  replyTo?: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.CONTACT_FROM
  if (!apiKey || !from || !input.to) {
    if (!apiKey || !from) console.error('[email] RESEND_API_KEY / CONTACT_FROM not set')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [input.to],
        reply_to: input.replyTo ?? DEFAULT_REPLY_TO,
        subject: input.subject,
        text: input.text,
      }),
    })
    if (!res.ok) console.error('[email] Resend responded', res.status)
    return res.ok
  } catch (cause) {
    console.error('[email] send failed', cause)
    return false
  }
}
