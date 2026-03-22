import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "BSA TONx402 — Pay-per-use APIs on TON",
    description: "HTTP 402 payment protocol on TON blockchain. Pay-per-request APIs with BSA USD micropayments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}