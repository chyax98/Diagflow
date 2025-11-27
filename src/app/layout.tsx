import type { Metadata } from "next";

import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/error-boundary";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiagFlow - AI 驱动的智能图表生成器",
  description: "通过自然语言对话快速生成流程图、时序图、架构图等 15+ 种专业图表。支持 Mermaid、PlantUML、D2 等多种引擎。",
  keywords: ["AI图表", "流程图生成", "Mermaid", "PlantUML", "架构图", "时序图"],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "DiagFlow - AI 智能图表生成器",
    description: "自然语言对话生成专业图表",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={"antialiased"}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
