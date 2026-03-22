import Link from "next/link";

export default function Page() {
    return (
        <>
            {/* Nav */}
            <nav className="nav">
                <a href="/" className="nav-logo">
                    <img src="/logo-text-white.png" alt="BSA" className="nav-logo-img" />
                    BSA <span>TONx402</span>
                </a>
                <div className="nav-links">
                    <Link href="/marketplace" className="nav-link" style={{ color: "#06b6d4", fontWeight: 600 }}>🛒 Marketplace</Link>
                    <Link href="/quickstart" className="nav-link">Quickstart</Link>
                    <a href="https://docs.ton.org" target="_blank" rel="noopener noreferrer" className="nav-link">TON Docs</a>
                    <Link href="/marketplace" className="btn btn-primary" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
                        🔐 Launch Marketplace
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="hero">
                <div className="badge">TON Blockchain · Hackathon Starter</div>
                <h1>
                    Build pay-per-use APIs<br />
                    <span className="gradient">on TON in minutes</span>
                </h1>
                <p>
                    x402 is an open protocol for HTTP micropayments.
                    Protect any API route with a single function. Clients pay automatically in BSA USD.
                </p>
                <div className="hero-buttons">
                    <Link href="/quickstart" className="btn btn-primary">
                        Get started
                    </Link>
                    <a
                        href="https://github.com/bsaepfl/bsa-sp-template-x402-2026"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                    >
                        GitHub
                    </a>
                </div>
            </section>


            <hr className="divider" />

            {/* Code preview */}
            <section className="section" style={{ textAlign: "center" }}>
                <h2 className="section-title">As simple as this</h2>
                <p className="section-sub">Protect any Next.js route in one line</p>
                <div className="code-block" style={{ maxWidth: "560px", margin: "0 auto", textAlign: "left" }}>
                    <span className="cm">{"// app/api/my-endpoint/route.ts"}</span><br />
                    <span className="kw">export const</span> GET = <span className="fn">paymentGate</span>(handler, {"{"}<br />
                    {"  "}config: {"{"}<br />
                    {"    "}amount: <span className="str">"1000000000"</span>,{" "}
                    <span className="cm">{"// 1 BSA USD"}</span><br />
                    {"    "}asset: <span className="str">JETTON_MASTER_ADDRESS</span>,<br />
                    {"    "}payTo: <span className="str">PAYMENT_ADDRESS</span>,<br />
                    {"  "}{"}"}<br />
                    {"}"});
                </div>
                <div style={{ marginTop: "2rem" }}>
                    <Link href="/quickstart" className="btn btn-primary">
                        See the full quickstart
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer>
                <p>
                    Built by{" "}
                    <a href="https://github.com/bsaepfl" target="_blank" rel="noopener noreferrer">BSA</a>
                    {" · "}
                    <a href="https://github.com/bsaepfl/bsa-sp-template-x402-2026" target="_blank" rel="noopener noreferrer">
                        ton-x402-hackathon-starter
                    </a>
                    {" · "}
                    TON Testnet
                </p>
            </footer>
        </>
    );
}