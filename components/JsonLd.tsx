/**
 * Renders a JSON-LD <script>. `data` is serialized with JSON.stringify (proper
 * escaping) and `<` is replaced with its unicode escape so embedded content can
 * never close the <script> tag early or inject markup.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      // Safe: JSON.stringify output with `<` escaped — not user-string concatenation.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
