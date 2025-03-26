import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface PageTitleProps {
  title: string;
  description?: string;
  backButtonUrl?: string;
}

export function PageTitle({ title, description, backButtonUrl }: PageTitleProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {backButtonUrl && (
          <Link 
            href={backButtonUrl} 
            className="btn btn-ghost btn-sm inline-flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        )}
        <h1 className="text-3xl font-bold">{title}</h1>
      </div>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
} 