import type { Metadata } from "next";
import { Fraunces, Archivo, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/* Three faces, three jobs.
   Fraunces carries the voice of the document — the agent's proposal reads
   as something written, not emitted. Archivo runs the chrome. Plex Mono is
   the patch: this product's content is, literally, a diff. */
const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const ui = Archivo({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "SpecFlow — plan software with your agent, not for it",
  description:
    "SpecFlow turns rough requirements into a structured project plan. Agents propose the plan through WebMCP as a reviewable diff; you approve it.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${ui.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#F7F4ED",
              border: "none",
              color: "#1B1F23",
              fontFamily: "var(--font-ui)",
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
