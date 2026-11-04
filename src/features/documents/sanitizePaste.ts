import DOMPurify from "dompurify";

// Sanitize before ProseMirror inserts clipboard HTML into the live editor.
// Imported images must pass the separate quarantine flow, including data URIs.
export function sanitizeDocumentPaste(html: string) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "del",
      "ul",
      "ol",
      "li",
      "h1",
      "h2",
      "h3",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "td",
      "th",
      "blockquote",
      "code",
      "hr",
    ],
    ALLOWED_ATTR: ["colspan", "rowspan", "start"],
    FORBID_TAGS: [
      "img",
      "svg",
      "math",
      "script",
      "style",
      "iframe",
      "object",
      "embed",
      "video",
      "audio",
      "link",
      "meta",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
