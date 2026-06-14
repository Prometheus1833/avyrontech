import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  business?: string
  phone?: string
  email?: string
  website?: string
  submittedAt?: string
}

const Email = ({
  name = '-',
  business = '-',
  phone = '-',
  email = '-',
  website = '',
  submittedAt = new Date().toISOString(),
}: Props) => (
  <Html lang="ro" dir="ltr">
    <Head />
    <Preview>Nouă solicitare de demo de la {name} ({business})</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Solicitare demo nouă</Heading>
        <Text style={lead}>
          Cineva a completat formularul „Vrei să vezi cum ar arăta site-ul tău?" pe avyron.ro.
        </Text>

        <Section style={card}>
          <Row label="Nume" value={name} />
          <Row label="Afacere" value={business} />
          <Row label="Telefon" value={phone} />
          <Row label="Email" value={email} />
          <Row label="Site actual" value={website || '—'} />
          <Hr style={hr} />
          <Row label="Trimis la" value={new Date(submittedAt).toLocaleString('ro-RO')} />
        </Section>

        <Text style={footer}>
          Răspunde direct la {email} pentru a continua conversația.
        </Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <Section style={rowSection}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value}</Text>
  </Section>
)

export const template = {
  component: Email,
  subject: (data: Props) =>
    `Solicitare demo — ${data?.business || data?.name || 'nou client'}`,
  displayName: 'Demo request notification',
  to: 'avyrontech@gmail.com',
  previewData: {
    name: 'Maria Popescu',
    business: 'Florărie Maria',
    phone: '+40 712 345 678',
    email: 'maria@example.com',
    website: 'florariemaria.ro',
    submittedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}
const container = { padding: '32px 24px', maxWidth: '560px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#0f172a',
  margin: '0 0 12px',
}
const lead = { fontSize: '14px', color: '#475569', margin: '0 0 24px' }
const card = {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '8px 20px',
  backgroundColor: '#f8fafc',
}
const rowSection = { margin: '12px 0' }
const rowLabel = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: '#64748b',
  margin: '0 0 2px',
  fontWeight: 600,
}
const rowValue = {
  fontSize: '15px',
  color: '#0f172a',
  margin: 0,
  fontWeight: 500,
}
const hr = { borderColor: '#e2e8f0', margin: '16px 0' }
const footer = {
  fontSize: '13px',
  color: '#64748b',
  marginTop: '20px',
}
