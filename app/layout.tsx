import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AwakeRift",
  description: "Connexion au jeu AwakeRift",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
