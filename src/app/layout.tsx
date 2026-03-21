import type { Metadata } from "next";
import "@/index.css";
import { AppProviders } from "@/providers/AppProviders";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_PORTAL_HOME_URL ?? "http://localhost:8080"
  ),
  title: "OranGen — AI for Integrated Marketing Intelligence",
  description: "Oran Gen Project",
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "OranGen — AI for Integrated Marketing Intelligence",
    description: "Oran Gen Project",
    type: "website",
    images: ["/tg-banner.png"],
  },
  twitter: {
    card: "summary_large_image",
    site: "@OranGen",
    images: ["/tg-banner.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
