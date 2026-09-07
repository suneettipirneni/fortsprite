export function SupportContact() {
  const contact = process.env.SUPPORT_CONTACT_URL?.trim()
  if (!contact) return null
  const url = new URL(contact)
  if (
    !["https:", "mailto:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error(
      "SUPPORT_CONTACT_URL must be an HTTPS contact page or mailto address",
    )

  return (
    <p className="text-sm text-muted-foreground">
      Need account help or have a privacy question?{" "}
      <a
        className="font-medium text-foreground underline underline-offset-4"
        href={url.href}
      >
        Contact FortSprite support
      </a>
      .
    </p>
  )
}
