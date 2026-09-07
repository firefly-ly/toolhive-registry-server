import Link from "next/link";
import { ErrorPageLayout } from "@/components/error-page/error-page";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  return (
    <ErrorPageLayout
      title="Page Not Found"
      actions={
        <Button asChild variant="action">
          <Link href="/catalog">Browse Catalog</Link>
        </Button>
      }
    >
      The page you're looking for doesn't exist or has been moved.
    </ErrorPageLayout>
  );
}
