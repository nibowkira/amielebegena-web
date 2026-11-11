import type { Metadata, Viewport } from "next";
import "./globals.css";

import { CurrencyProvider } from "../context/CurrencyContext";
import { CartProvider } from "../context/CartContext";
import { AuthProvider } from "../context/AuthContext";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CartDrawer from "../components/CartDrawer";
import WhatsAppModal from "../components/WhatsAppModal";
import WhatsAppFloating from "../components/WhatsAppFloating";
import ScrollObserver from "../components/ScrollObserver";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Amiele Begena (ዓሚኤል በገና) — Sacred Ethiopian Musical Instruments",
  description:
    "Preserving ancient acoustic heritage and sacred Ethiopian craftsmanship. Handcrafted Begena (Harp of David), Kirar, Masinko, and liturgical accessories made in Addis Ababa with worldwide shipping.",
  keywords: [
    "Begena",
    "Ethiopian Begena",
    "Harp of David",
    "Kirar",
    "Masinko",
    "Ethiopian Musical Instruments",
    "Addis Ababa Artisans",
    "Sacred Music",
  ],
  authors: [{ name: "Amiele Begena Artisans" }],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#FAF8F5] text-[#14231b] flex flex-col justify-between antialiased">
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <ScrollObserver />
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <CartDrawer />
              <WhatsAppModal />
              <WhatsAppFloating />
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
