import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Legisla Monitor — Monitor Legislativo",
  description:
    "Acompanhe proposições da Câmara Federal e Câmara Municipal de Porto Alegre por palavras-chave. Notificações de novas proposições, votações e tramitações.",
  keywords: ["legislação", "câmara", "proposições", "PLs", "monitor", "porto alegre"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <div className="flex min-h-screen">
          <Sidebar />

          {/* Conteúdo principal — offset pela sidebar fixa */}
          <main className="flex-1 ml-64 min-h-screen flex flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
