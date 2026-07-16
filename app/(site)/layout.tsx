import { AnnouncementBar } from '@/components/site/AnnouncementBar'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'

/**
 * Shared chrome for the content site (spots, taxonomy indexes/details). Nests
 * inside the root layout (which owns <html>/<body>/fonts). Studio and the
 * Builder marketing route live OUTSIDE this group and deliberately render
 * without this chrome.
 *
 * This layout does not render a <main> — each page owns its own <main> element.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
