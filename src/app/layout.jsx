import "./globals.css";
import { Space_Grotesk } from "next/font/google";
import ThemeInitializer from "@/components/ui/ThemeInitializer";

const font = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-geist-sans",
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

const mono = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-geist-mono",
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

export const metadata = {
    title: "DBuddy",
    description: "The Ultimate Backend Manager",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${font.variable} ${mono.variable} antialiased`}>
                <ThemeInitializer />
                {children}
            </body>
        </html>
    );
}