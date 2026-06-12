import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentClaw",
  description: "Agent-based intelligent knowledge base",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <div id="toast-portal" />
      </body>
    </html>
  );
}
