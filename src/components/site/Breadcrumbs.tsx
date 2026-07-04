import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/**
 * Accessible visible breadcrumb trail. Renders the last item as plain text (current page).
 * Pair with a matching BreadcrumbList JSON-LD (see src/lib/structuredData.ts).
 */
const Breadcrumbs = ({
  items,
  className = "",
}: {
  items: BreadcrumbItem[];
  className?: string;
}) => {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={it.path} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight
                  aria-hidden
                  className="size-3.5 text-muted-foreground/50 shrink-0"
                />
              )}
              {isLast ? (
                <span aria-current="page" className="text-foreground font-medium">
                  {it.name}
                </span>
              ) : (
                <Link
                  to={it.path}
                  className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  {it.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
