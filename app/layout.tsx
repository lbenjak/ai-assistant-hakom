import "./globals.css";
import Warnings from "./components/warnings";
import { assistantId } from "./assistant-config";
import { inter } from "./fonts";

export const metadata = {
  title: "HAKOM AI Virtualni asistent",
  description: "HAKOM AI Virtualni asistent - Vaš digitalni asistent",
  icons: {
    icon: "/HAKOM_logo_2.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {assistantId ? children : <Warnings />}
      </body>
    </html>
  );
}
