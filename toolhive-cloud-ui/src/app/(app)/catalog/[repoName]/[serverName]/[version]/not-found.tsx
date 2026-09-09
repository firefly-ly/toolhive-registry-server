import Link from "next/link";
import { ErrorPageLayout } from "@/components/error-page/error-page";
import { NavigateBackButton } from "@/components/navigate-back-button";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-5">
      <NavigateBackButton
        href="/catalog"
        variant="outline"
        size="sm"
        className="w-fit"
      />

      <ErrorPageLayout
        title="未找到该服务"
        actions={
          <Button asChild variant="action">
            <Link href="/catalog">浏览 MCP 市场</Link>
          </Button>
        }
      >
        你要找的 MCP 服务不存在，或已从 MCP 市场中移除。
      </ErrorPageLayout>
    </div>
  );
}
