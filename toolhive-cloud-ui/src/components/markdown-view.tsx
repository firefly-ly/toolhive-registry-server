import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * 轻量 Markdown 渲染器（README 等展示用）。
 * - react-markdown 默认不执行原始 HTML，天然防 XSS；
 * - remark-gfm 支持表格、删除线、任务列表、自动链接；
 * - 外链统一新窗口打开；
 * - prose 样式来自 @tailwindcss/typography（globals.css 已 @plugin 注册）。
 */
export function MarkdownView({ content }: { content: string }) {
  return (
    <div className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/30 p-4">
      <div className="prose prose-sm dark:prose-invert max-w-none prose-code:before:content-none prose-code:after:content-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
            // prose 默认给代码块配"深底浅字"固定色，与主题变量叠加后会看不清。
            // 这里显式覆盖为主题 token：背景跟随 muted、文字跟随 foreground，深浅色模式都有对比度。
            pre: ({ children }) => (
              <pre className="my-3 overflow-x-auto rounded-md border bg-muted p-3 text-xs leading-5 text-foreground">
                {children}
              </pre>
            ),
            code: ({
              className,
              children,
            }: {
              className?: string;
              children?: React.ReactNode;
            }) => {
              const isBlock = /language-/.test(className ?? "");
              if (isBlock) {
                return (
                  <code className="font-mono text-xs text-foreground">
                    {children}
                  </code>
                );
              }
              return (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground">
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
