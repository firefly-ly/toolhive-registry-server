import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/header-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title="页面未找到" />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex max-w-3xl items-center justify-center py-4">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">页面未找到</CardTitle>
              <CardDescription className="text-base">
                你访问的资源不存在或已被移除。
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center gap-3">
              <Button variant="outline" size="sm" asChild>
                <Link href="/catalog">返回 MCP 市场</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/skills">返回技能市场</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
