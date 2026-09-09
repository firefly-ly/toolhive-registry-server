import Link from "next/link";
import { ErrorPageLayout } from "@/components/error-page/error-page";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  return (
    <ErrorPageLayout
      title="页面不存在"
      actions={
        <Button asChild variant="action">
          <Link href="/catalog">浏览 MCP 市场</Link>
        </Button>
      }
    >
      你要访问的页面不存在或已被移动。
    </ErrorPageLayout>
  );
}
