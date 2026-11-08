import { useState, type ImgHTMLAttributes } from "react";
import { BookOpen } from "lucide-react";
import { resolveBlogMediaUrl, BLOG_COVER_FALLBACK } from "@/lib/blogMedia";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src?: string | null;
  alt: string;
};
/** Failed/quarantined remote media never triggers a direct storage URL retry. */
export default function BlogCover({ src, alt, ...props }: Props) {
  const source = resolveBlogMediaUrl(src);
  const [failure, setFailure] = useState({ source: "", stage: 0 });
  const stage = failure.source === source ? failure.stage : 0;
  if (stage === 2)
    return (
      <div
        role="img"
        aria-label={alt}
        className={`${props.className || ""} grid place-items-center bg-gradient-to-br from-brand/15 via-muted to-brand/5`}
        data-blog-cover="placeholder"
      >
        <BookOpen className="size-10 text-brand/60" aria-hidden="true" />
      </div>
    );
  return (
    <img
      {...props}
      src={stage === 1 ? BLOG_COVER_FALLBACK : source}
      alt={alt}
      decoding="async"
      data-blog-cover={stage ? "fallback" : "original"}
      onError={() =>
        setFailure({
          source,
          stage: stage === 1 || source === BLOG_COVER_FALLBACK ? 2 : 1,
        })
      }
    />
  );
}
