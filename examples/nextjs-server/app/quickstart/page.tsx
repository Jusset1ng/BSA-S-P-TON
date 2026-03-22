import Link from "next/link";

export default function QuickstartPage() {
    return (
        <>
            {/* Nav */}
            <nav className="nav">
                <Link href="/" className="nav-logo">
                    <img src="/logo-text-white.png" alt="BSA" className="nav-logo-img" />
                    BSA <span>TONx402</span>
                </Link>
                <div className="nav-links">
                    <a href="#quickstart" className="nav-link">Quickstart</a>
                    <a href="#how" className="nav-link">How it works</a>
                    <button className="btn btn-wallet" disabled>
                        Connect Wallet
                    </button>
                </div>
            </nav>

            {/* Quickstart */}
            <section className="section" id="quickstart" style={{ paddingTop: "5rem" }}>
                <h2 className="section-title">Quickstart</h2>
                <p className="section-sub">From zero to a paid API in under 5 minutes</p>
                <div className="steps">
                    <div className="step">
                        <div className="step-num">Step 01</div>
                        <h3>Clone the repo</h3>
                        <div className="code-block" style={{ marginTop: "0.75rem" }}>
                            git clone git@github.com:bsaepfl/bsa-sp-template-x402-2026.git<br />
                        </div>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 02</div>
                        <h3>Configure your environment</h3>
                        <div className="code-block" style={{ marginTop: "0.75rem" }}>
                            cd examples/nextjs-server<br />
                            cp .env.example .env.local
                        </div>
                        <p style={{ marginTop: "0.75rem" }}>
                            Fill in <code>.env.local</code>: your wallet mnemonic, payment recipient address,
                            Toncenter API key, and Jetton master address.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 03</div>
                        <h3>Get testnet BSA USD</h3>
                        <p>
                            Use the{" "}
                            <a
                                href="https://t.me/bsa_testnet_faucet_bot"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--cyan)" }}
                            >
                                BSA testnet faucet
                            </a>{" "}
                            to receive BSA USD on TON testnet.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 04</div>
                        <h3>Run the dev server</h3>
                        <div className="code-block" style={{ marginTop: "0.75rem" }}>
                            <span className="cm"># From the repo root</span><br />
                            pnpm install<br />
                            pnpm build<br />
                            pnpm dev
                        </div>
                        <p style={{ marginTop: "0.75rem" }}>
                            This starts the Next.js dev server at <code>localhost:3000</code>.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 05</div>
                        <h3>Protect your route</h3>
                        <p>
                            Wrap your handler with <code>paymentGate()</code>. See{" "}
                            <code>examples/nextjs-server/app/api/joke/route.ts</code> for a working example.
                        </p>
                        <div className="code-block" style={{ marginTop: "0.75rem" }}>
                            <span className="kw">export const</span> GET = <span className="fn">paymentGate</span>(handler, {"{"}<br />
                            {"  "}config: <span className="fn">getPaymentConfig</span>({"{"}<br />
                            {"    "}amount: <span className="str">"1000000000"</span>,<br />
                            {"    "}asset: process.<span className="fn">env</span>.<span className="str">JETTON_MASTER_ADDRESS</span>,<br />
                            {"  "}{"}"})<br />
                            {"}"});
                        </div>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 06</div>
                        <h3>Call it with x402Fetch</h3>
                        <p>
                            Use <code>x402Fetch()</code> from the client package to handle the full payment flow automatically.
                            See <code>examples/client-script/src/pay.ts</code> for a complete working example.
                        </p>
                        <div className="code-block" style={{ marginTop: "0.75rem" }}>
                            <span className="cm"># From the repo root</span><br />
                            pnpm dev:client<br />
                            <span className="cm"># or target a specific endpoint</span><br />
                            pnpm dev:client:joke
                        </div>
                    </div>
                </div>
            </section>

            <hr className="divider" />

            {/* How it works */}
            <section className="section" id="how">
                <h2 className="section-title">How it works</h2>
                <p className="section-sub">The full x402 payment flow, step by step</p>
                <div className="steps">
                    <div className="step">
                        <div className="step-num">Step 01</div>
                        <h3>Client requests the resource</h3>
                        <p>
                            The client makes a standard HTTP request to a protected API endpoint.
                            No payment is attached yet.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 02</div>
                        <h3>Server returns HTTP 402</h3>
                        <p>
                            The server responds with <strong>402 Payment Required</strong> and a{" "}
                            <code>PAYMENT-REQUIRED</code> header containing the payment details:
                            amount, asset (BSA USD), recipient address, and facilitator URL.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 03</div>
                        <h3>Client builds and signs the payment</h3>
                        <p>
                            <code>x402Fetch()</code> parses the payment requirements, builds a TEP-74
                            Jetton transfer BOC on TON, and signs it with the client wallet key.
                            No transaction is broadcast yet.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 04</div>
                        <h3>Client retries with the signed BOC</h3>
                        <p>
                            The same request is retried with a <code>PAYMENT-SIGNATURE</code> header
                            containing the base64-encoded signed BOC. The server forwards it to the
                            facilitator for verification.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 05</div>
                        <h3>Facilitator verifies and settles on-chain</h3>
                        <p>
                            The facilitator verifies the BOC offline (correct recipient, amount, network),
                            then broadcasts it to the TON blockchain and polls for confirmation.
                        </p>
                    </div>
                    <div className="step">
                        <div className="step-num">Step 06</div>
                        <h3>Server unlocks the resource</h3>
                        <p>
                            Once the transaction is confirmed on-chain, the server calls the handler
                            and returns the protected resource along with the TX hash in a{" "}
                            <code>PAYMENT-RESPONSE</code> header.
                        </p>
                    </div>
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
