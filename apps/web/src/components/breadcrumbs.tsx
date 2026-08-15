import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-4 flex items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 ? <span className="text-muted">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="text-muted hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground-strong font-medium">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
