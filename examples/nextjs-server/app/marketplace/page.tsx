"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ============================================================
// Types & Data
// ============================================================

interface Product {
    id: number;
    emoji: string;
    name: string;
    category: string;
    price: number; // in TON
    desc: string;
    seller: string;
}

interface WalletInfo {
    address: string;
    shortAddress: string;
    balance: string;
    network: string;
    demo: boolean;
}

type PaymentStep = "idle" | "passkey" | "signing" | "verifying" | "settling" | "success" | "error";

const products: Product[] = [
    { id: 1, emoji: "💻", name: "MacBook Air M3 (Refurb)", category: "tech", price: 1.5, desc: "Like-new, 16GB RAM, 512GB SSD. Verified by BSA Tech.", seller: "TechResale_EPFL" },
    { id: 2, emoji: "🎧", name: "Sony WH-1000XM5", category: "tech", price: 0.25, desc: "Premium noise-cancelling. Minor cosmetic scratches only.", seller: "AudioLab_BSA" },
    { id: 3, emoji: "👟", name: "Nike Air Jordan 1 Mid", category: "fashion", price: 0.18, desc: "Size EU 42, worn twice. Box included. Authentic verified.", seller: "Sneakers_Col" },
    { id: 4, emoji: "🍕", name: "Pizza Night Bundle (×4)", category: "food", price: 0.08, desc: "4 pizzas from La Grappe d'Or, Lausanne. Valid 30 days.", seller: "FoodPass_EPFL" },
    { id: 5, emoji: "🎨", name: 'Digital Art — "TON Genesis"', category: "art", price: 0.05, desc: "Limited edition NFT-backed print, 1/50. Signed by artist.", seller: "CryptoArt_Studio" },
    { id: 6, emoji: "⌚", name: "Apple Watch Series 9", category: "tech", price: 0.35, desc: "45mm Midnight, GPS+Cellular. Excellent condition.", seller: "WatchMarket_CH" },
    { id: 7, emoji: "👗", name: "Levi's 501 Original Jeans", category: "fashion", price: 0.06, desc: "W30 L32, vintage wash. Ships from Lausanne.", seller: "Vintage_EPFL" },
    { id: 8, emoji: "☕", name: "Coffee Sub (1 month)", category: "food", price: 0.12, desc: "Daily espresso at EPFL BC. 20 drinks prepaid.", seller: "CampusCoffee" },
    { id: 9, emoji: "🖼️", name: 'Banksy Print "Balloon Girl"', category: "art", price: 0.22, desc: "High-quality A2 framed reproduction. New.", seller: "ArtHouse_Geneva" },
    { id: 10, emoji: "📱", name: "iPhone 15 Pro — 256GB", category: "tech", price: 0.95, desc: "Natural Titanium, 100% battery. Apple warranty.", seller: "iResale_Suisse" },
    { id: 11, emoji: "🧴", name: "Luxury Skincare Set", category: "fashion", price: 0.09, desc: "La Mer moisturizer + serum. Sealed gift set.", seller: "BeautyVault_BSA" },
    { id: 12, emoji: "🍣", name: "Sushi Date Voucher", category: "food", price: 0.15, desc: "2-person dinner at Matsuri Geneva. Includes drinks.", seller: "FineFood_Pass" },
];

const categories = ["all", "tech", "fashion", "food", "art"];
const categoryEmojis: Record<string, string> = { all: "🛒", tech: "⚡", fashion: "👗", food: "🍕", art: "🎨" };

// ============================================================
// WebAuthn Helpers
// ============================================================

function bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateChallenge(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
}

function generateUserId(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(16));
}

// ============================================================
// Component
// ============================================================

export default function MarketplacePage() {
    // Wallet state
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [walletLoading, setWalletLoading] = useState(false);
    const [credentialId, setCredentialId] = useState<string | null>(null);

    // Marketplace state
    const [filter, setFilter] = useState("all");
    const [purchasedIds, setPurchasedIds] = useState<Set<number>>(new Set());

    // Payment modal
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [paymentStep, setPaymentStep] = useState<PaymentStep>("idle");
    const [txResult, setTxResult] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState("");

    // Check for existing passkey registration
    useEffect(() => {
        const stored = localStorage.getItem("bsa-passkey-credential");
        if (stored) setCredentialId(stored);
    }, []);

    // Fetch wallet info after connection
    const fetchWallet = useCallback(async () => {
        try {
            const res = await fetch("/api/wallet");
            const data = await res.json();
            setWallet(data);
        } catch {
            setWallet({
                address: "EQDemo...Address",
                shortAddress: "EQDe...ress",
                balance: "47.25",
                network: "testnet",
                demo: true,
            });
        }
    }, []);

    useEffect(() => {
        if (credentialId) fetchWallet();
    }, [credentialId, fetchWallet]);

    // ── Passkey Registration ──
    async function registerPasskey() {
        setWalletLoading(true);
        try {
            if (!window.PublicKeyCredential) {
                throw new Error("WebAuthn is not supported in this browser");
            }

            const challenge = generateChallenge();
            const userId = generateUserId();

            const credential = (await navigator.credentials.create({
                publicKey: {
                    challenge: challenge.buffer as ArrayBuffer,
                    rp: {
                        name: "BSA Marketplace",
                        id: window.location.hostname,
                    },
                    user: {
                        id: userId.buffer as ArrayBuffer,
                        name: "wallet@bsa-marketplace.ton",
                        displayName: "BSA Wallet",
                    },
                    pubKeyCredParams: [
                        { type: "public-key", alg: -7 },   // ES256
                        { type: "public-key", alg: -257 },  // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform", // Forces Face ID / Touch ID
                        userVerification: "required",
                        residentKey: "required",
                    },
                    timeout: 60000,
                    attestation: "none",
                },
            })) as PublicKeyCredential | null;

            if (!credential) throw new Error("Passkey creation cancelled");

            const credId = bufferToBase64Url(credential.rawId);
            localStorage.setItem("bsa-passkey-credential", credId);
            setCredentialId(credId);

            // Fetch wallet info
            await fetchWallet();
        } catch (e: any) {
            console.error("Passkey registration failed:", e);
            alert("Passkey creation failed: " + e.message);
        } finally {
            setWalletLoading(false);
        }
    }

    // ── Passkey Authentication (for purchase) ──
    async function authenticatePasskey(): Promise<boolean> {
        try {
            const challenge = generateChallenge();

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge.buffer as ArrayBuffer,
                    userVerification: "required",
                    timeout: 60000,
                },
            });

            return !!assertion;
        } catch (e: any) {
            console.error("Passkey auth failed:", e);
            return false;
        }
    }

    // ── Purchase Flow ──
    async function purchaseProduct(product: Product) {
        setSelectedProduct(product);
        setPaymentStep("idle");
        setTxResult(null);
        setErrorMsg("");
    }

    async function confirmPurchase() {
        if (!selectedProduct) return;

        try {
            // Step 1: Passkey authentication
            setPaymentStep("passkey");
            const authed = await authenticatePasskey();
            if (!authed) {
                setPaymentStep("error");
                setErrorMsg("Passkey authentication failed or was cancelled.");
                return;
            }

            // Step 2: Sign BOC
            setPaymentStep("signing");
            await delay(400);

            // Step 3: Call purchase API (verify + settle)
            setPaymentStep("verifying");

            const res = await fetch("/api/marketplace/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    productName: selectedProduct.name,
                    price: selectedProduct.price.toString(),
                }),
            });

            const data = await res.json();

            if (!data.success) {
                setPaymentStep("error");
                setErrorMsg(data.error || "Payment failed");
                return;
            }

            // Step 4: Settlement
            setPaymentStep("settling");
            await delay(600);

            // Success!
            setPaymentStep("success");
            setTxResult(data);
            setPurchasedIds((prev) => new Set([...prev, selectedProduct.id]));

            // Update balance locally immediately (don't wait for blockchain)
            setWallet((prev) => {
                if (!prev) return prev;
                const newBalance = (parseFloat(prev.balance) - selectedProduct.price).toFixed(2);
                return { ...prev, balance: newBalance };
            });
        } catch (e: any) {
            setPaymentStep("error");
            setErrorMsg(e.message || "An unexpected error occurred");
        }
    }

    function closeModal() {
        if (paymentStep === "passkey" || paymentStep === "signing" || paymentStep === "verifying" || paymentStep === "settling") return;
        setSelectedProduct(null);
        setPaymentStep("idle");
    }

    const filteredProducts = filter === "all" ? products : products.filter((p) => p.category === filter);

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <>
            <style>{styles}</style>

            {/* NAV */}
            <nav className="mp-nav">
                <Link href="/" className="mp-nav-logo">
                    🛒 BSA Marketplace
                    <span className="mp-badge mp-badge-ton">TON</span>
                    <span className="mp-badge mp-badge-x402">x402</span>
                    <span className="mp-badge mp-badge-passkey">Passkey</span>
                </Link>

                <div className="mp-nav-right">
                    {wallet ? (
                        <div className="mp-wallet-chip">
                            <div className="mp-wallet-dot" />
                            <div>
                                <div className="mp-wallet-addr">{wallet.shortAddress}</div>
                                <div className="mp-wallet-bal">
                                    {wallet.balance} <span>TON</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <button
                            className="mp-btn-connect"
                            onClick={registerPasskey}
                            disabled={walletLoading}
                        >
                            {walletLoading ? (
                                <>
                                    <span className="mp-spinner" /> Authenticating...
                                </>
                            ) : (
                                "🔐 Connect with Passkey"
                            )}
                        </button>
                    )}
                </div>
            </nav>

            {/* HERO */}
            <section className="mp-hero">
                <h1>
                    Buy anything, pay with <span className="mp-gradient">Face ID</span>
                </h1>
                <p>
                    The first marketplace powered by <strong>Apple Passkeys</strong> and the{" "}
                    <strong>x402 protocol</strong> on TON. No card, no seed phrase — just your biometrics.
                </p>

                {/* Protocol flow */}
                <div className="mp-flow">
                    <div className="mp-flow-step">
                        <div className="mp-flow-icon">🛍️</div>
                        <div className="mp-flow-label"><strong>Browse</strong>Pick a product</div>
                    </div>
                    <div className="mp-flow-arrow">→</div>
                    <div className="mp-flow-step">
                        <div className="mp-flow-icon">🔐</div>
                        <div className="mp-flow-label"><strong>Face ID</strong>Passkey auth</div>
                    </div>
                    <div className="mp-flow-arrow">→</div>
                    <div className="mp-flow-step">
                        <div className="mp-flow-icon">✍️</div>
                        <div className="mp-flow-label"><strong>Sign BOC</strong>Server wallet</div>
                    </div>
                    <div className="mp-flow-arrow">→</div>
                    <div className="mp-flow-step">
                        <div className="mp-flow-icon">⛓️</div>
                        <div className="mp-flow-label"><strong>Settle</strong>On-chain TON</div>
                    </div>
                    <div className="mp-flow-arrow">→</div>
                    <div className="mp-flow-step">
                        <div className="mp-flow-icon">📦</div>
                        <div className="mp-flow-label"><strong>Done</strong>Item unlocked</div>
                    </div>
                </div>
            </section>

            {/* FILTERS */}
            <div className="mp-filters">
                <h2>Products</h2>
                {categories.map((cat) => (
                    <button
                        key={cat}
                        className={`mp-filter-btn ${filter === cat ? "active" : ""}`}
                        onClick={() => setFilter(cat)}
                    >
                        {categoryEmojis[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                ))}
                <div className="mp-price-hint">TON · TON Testnet</div>
            </div>

            {/* PRODUCTS GRID */}
            <div className="mp-grid">
                {filteredProducts.map((p) => {
                    const purchased = purchasedIds.has(p.id);
                    return (
                        <div
                            key={p.id}
                            className={`mp-card ${purchased ? "mp-card-purchased" : ""}`}
                            onClick={() => !purchased && wallet && purchaseProduct(p)}
                        >
                            <div className="mp-card-img">{p.emoji}</div>
                            {purchased && <div className="mp-tag-sold">✓ PURCHASED</div>}
                            <div className="mp-card-body">
                                <div className="mp-card-category">{p.category}</div>
                                <div className="mp-card-name">{p.name}</div>
                                <div className="mp-card-desc">{p.desc}</div>
                                <div className="mp-card-footer">
                                    <div className="mp-card-price">
                                        {p.price.toFixed(2)}
                                        <span className="mp-currency">TON</span>
                                    </div>
                                    {purchased ? (
                                        <span className="mp-purchased-label">✓ Purchased</span>
                                    ) : wallet ? (
                                        <button
                                            className="mp-btn-buy"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                purchaseProduct(p);
                                            }}
                                        >
                                            Buy Now
                                        </button>
                                    ) : (
                                        <button className="mp-btn-buy mp-btn-disabled" disabled>
                                            Connect first
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* PAYMENT MODAL */}
            {selectedProduct && (
                <div className="mp-overlay" onClick={closeModal}>
                    <div className="mp-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="mp-modal-header">
                            <h3>💸 Checkout — x402 + Passkey</h3>
                            <button className="mp-modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="mp-modal-body">
                            {paymentStep !== "success" ? (
                                <>
                                    {/* Product summary */}
                                    <div className="mp-pay-product">
                                        <div className="mp-pay-emoji">{selectedProduct.emoji}</div>
                                        <div className="mp-pay-info">
                                            <div className="mp-pay-name">{selectedProduct.name}</div>
                                            <div className="mp-pay-seller">by {selectedProduct.seller}</div>
                                        </div>
                                        <div className="mp-pay-amount">
                                            <div className="mp-amount-val">{selectedProduct.price.toFixed(2)}</div>
                                            <div className="mp-amount-cur">TON</div>
                                        </div>
                                    </div>

                                    {/* Wallet balance */}
                                    <div className="mp-pay-balance">
                                        <span>Your balance</span>
                                        <strong>{wallet?.balance || "—"} TON</strong>
                                    </div>

                                    {/* Steps */}
                                    <div className="mp-pay-steps">
                                        <PayStep
                                            n={1}
                                            title="Authenticate with Passkey"
                                            sub="Face ID / Touch ID biometric verification"
                                            state={stepState("passkey", paymentStep)}
                                        />
                                        <PayStep
                                            n={2}
                                            title="Sign BOC (Bag of Cells)"
                                            sub="Wallet signs transaction locally"
                                            state={stepState("signing", paymentStep)}
                                        />
                                        <PayStep
                                            n={3}
                                            title="Facilitator Verify"
                                            sub="Offline BOC signature validation"
                                            state={stepState("verifying", paymentStep)}
                                        />
                                        <PayStep
                                            n={4}
                                            title="Settle On-Chain"
                                            sub="Broadcast to TON, wait for confirmation"
                                            state={stepState("settling", paymentStep)}
                                        />
                                    </div>

                                    {paymentStep === "error" && (
                                        <div className="mp-error-box">{errorMsg}</div>
                                    )}

                                    {/* Action button */}
                                    {paymentStep === "idle" || paymentStep === "error" ? (
                                        <button className="mp-btn-pay" onClick={confirmPurchase}>
                                            🔐 Confirm with Passkey — {selectedProduct.price.toFixed(2)} TON
                                        </button>
                                    ) : (
                                        <button className="mp-btn-pay mp-btn-processing" disabled>
                                            <span className="mp-spinner" /> Processing...
                                        </button>
                                    )}
                                </>
                            ) : (
                                /* SUCCESS SCREEN */
                                <div className="mp-success">
                                    <div className="mp-success-icon">✅</div>
                                    <div className="mp-success-title">Payment Confirmed!</div>
                                    <div className="mp-success-sub">
                                        <strong>{selectedProduct.name}</strong> purchased via x402 + Passkey
                                        {txResult?.demo && " (demo mode)"}
                                    </div>

                                    <div className="mp-tx-box">
                                        <div className="mp-tx-label">TX Hash</div>
                                        <div className="mp-tx-hash">{txResult?.txHash}</div>
                                    </div>

                                    {!txResult?.demo && (
                                        <a
                                            href={`https://testnet.tonviewer.com/transaction/${txResult?.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mp-tx-link"
                                        >
                                            View on TON Explorer →
                                        </a>
                                    )}

                                    <div className="mp-pay-balance" style={{ width: "100%", marginTop: "8px" }}>
                                        <span>New balance</span>
                                        <strong style={{ color: "#0098EA" }}>{wallet?.balance || "—"} TON</strong>
                                    </div>

                                    <button className="mp-btn-close" onClick={closeModal}>
                                        🎉 Back to Marketplace
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <footer className="mp-footer">
                BSA x TON Hackathon · x402 Protocol · Apple Passkeys · TON on TON Testnet
                <br />
                <span style={{ opacity: 0.5, fontSize: "0.75rem" }}>
                    Custodial wallet demo — Passkey guards access, server signs BOC
                </span>
            </footer>
        </>
    );
}

// ============================================================
// Payment Step Component
// ============================================================

function PayStep({ n, title, sub, state }: { n: number; title: string; sub: string; state: "pending" | "active" | "done" }) {
    return (
        <div className="mp-step">
            <div className={`mp-step-num ${state}`}>
                {state === "done" ? "✓" : n}
            </div>
            <div className="mp-step-info">
                <div className="mp-step-title">{title}</div>
                <div className="mp-step-sub">{sub}</div>
            </div>
            <div className={`mp-step-status ${state}`}>
                {state === "active" && <><span className="mp-spinner" /> Processing</>}
                {state === "done" && "✓ Done"}
                {state === "pending" && "Waiting"}
            </div>
        </div>
    );
}

function stepState(step: PaymentStep, current: PaymentStep): "pending" | "active" | "done" {
    const order: PaymentStep[] = ["passkey", "signing", "verifying", "settling"];
    const stepIdx = order.indexOf(step);
    const currentIdx = order.indexOf(current);
    if (current === "success") return "done";
    if (current === "error") {
        if (stepIdx < currentIdx) return "done";
        if (stepIdx === currentIdx) return "active";
        return "pending";
    }
    if (currentIdx === -1) return "pending";
    if (stepIdx < currentIdx) return "done";
    if (stepIdx === currentIdx) return "active";
    return "pending";
}

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// STYLES
// ============================================================

const styles = `
  .mp-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 2rem; height: 68px;
    background: rgba(6,13,31,0.95); border-bottom: 1px solid var(--border);
    backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 100;
  }
  .mp-nav-logo {
    display: flex; align-items: center; gap: 10px;
    font-weight: 700; font-size: 1.05rem; color: var(--text); text-decoration: none;
  }
  .mp-badge {
    font-size: 0.6rem; font-weight: 700; padding: 2px 8px;
    border-radius: 20px; letter-spacing: 0.5px;
  }
  .mp-badge-ton { background: #0098EA; color: white; }
  .mp-badge-x402 { background: #7C3AED; color: white; }
  .mp-badge-passkey { background: #2ECC71; color: #0B0F1A; }
  .mp-nav-right { display: flex; align-items: center; }

  .mp-btn-connect {
    background: linear-gradient(135deg, #0098EA, #006DB3);
    color: white; border: none; border-radius: 50px;
    padding: 10px 22px; font-size: 0.88rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; gap: 8px;
  }
  .mp-btn-connect:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 4px 20px rgba(0,152,234,0.3); }
  .mp-btn-connect:disabled { opacity: 0.7; cursor: not-allowed; }

  .mp-wallet-chip {
    display: flex; align-items: center; gap: 12px;
    background: var(--bg-card); border: 1px solid var(--border);
    border-radius: 50px; padding: 8px 16px;
  }
  .mp-wallet-dot {
    width: 8px; height: 8px; background: #2ECC71; border-radius: 50%;
    animation: mp-pulse 2s infinite;
  }
  @keyframes mp-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
  .mp-wallet-addr { font-size: 0.78rem; color: var(--muted); font-family: monospace; }
  .mp-wallet-bal { font-weight: 700; font-size: 0.88rem; }
  .mp-wallet-bal span { color: #0098EA; font-size: 0.78rem; }

  /* HERO */
  .mp-hero {
    text-align: center; padding: 60px 2rem 48px;
    position: relative; overflow: hidden;
  }
  .mp-hero::before {
    content: ''; position: absolute; top: -120px; left: 50%; transform: translateX(-50%);
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(0,152,234,0.1) 0%, transparent 70%);
    pointer-events: none;
  }
  .mp-hero h1 { font-size: 2.4rem; font-weight: 800; line-height: 1.2; margin-bottom: 16px; }
  .mp-gradient {
    background: linear-gradient(135deg, #3b82f6, #06b6d4);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .mp-hero p {
    color: var(--muted); max-width: 540px; margin: 0 auto 32px;
    font-size: 1.05rem; line-height: 1.6;
  }

  /* FLOW */
  .mp-flow { display: flex; align-items: center; justify-content: center; gap: 0; flex-wrap: wrap; margin-top: 24px; }
  .mp-flow-step { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 16px; }
  .mp-flow-icon {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.3rem; background: var(--bg-card); border: 1px solid var(--border);
  }
  .mp-flow-label { font-size: 0.72rem; color: var(--muted); text-align: center; max-width: 80px; }
  .mp-flow-label strong { color: var(--text); display: block; font-size: 0.78rem; }
  .mp-flow-arrow { color: #0098EA; font-size: 1.2rem; margin-top: -18px; }

  /* FILTERS */
  .mp-filters { display: flex; align-items: center; gap: 12px; padding: 24px 2rem 16px; flex-wrap: wrap; }
  .mp-filters h2 { font-size: 1.2rem; font-weight: 700; margin-right: 8px; }
  .mp-filter-btn {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 50px;
    padding: 7px 16px; font-size: 0.82rem; color: var(--muted); cursor: pointer; transition: all 0.2s;
  }
  .mp-filter-btn:hover, .mp-filter-btn.active {
    background: #0098EA; border-color: #0098EA; color: white;
  }
  .mp-price-hint { margin-left: auto; color: var(--muted); font-size: 0.82rem; }

  /* GRID */
  .mp-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px; padding: 8px 2rem 48px;
  }
  .mp-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
    overflow: hidden; transition: all 0.25s; cursor: pointer; position: relative;
  }
  .mp-card:hover:not(.mp-card-purchased) {
    border-color: rgba(0,152,234,0.4); transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.4);
  }
  .mp-card-purchased { opacity: 0.7; }
  .mp-card-img {
    width: 100%; height: 180px; display: flex; align-items: center; justify-content: center;
    font-size: 4rem; background: linear-gradient(135deg, var(--bg-card), var(--bg));
  }
  .mp-tag-sold {
    position: absolute; top: 12px; right: 12px;
    background: rgba(6,13,31,0.85); border: 1px solid #2ECC71; color: #2ECC71;
    font-size: 0.72rem; font-weight: 700; padding: 3px 10px; border-radius: 20px;
  }
  .mp-card-body { padding: 16px; }
  .mp-card-category {
    font-size: 0.72rem; color: #0098EA; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;
  }
  .mp-card-name { font-size: 1rem; font-weight: 700; margin-bottom: 6px; line-height: 1.3; }
  .mp-card-desc { font-size: 0.82rem; color: var(--muted); margin-bottom: 14px; line-height: 1.5; }
  .mp-card-footer { display: flex; align-items: center; justify-content: space-between; }
  .mp-card-price { font-size: 1.1rem; font-weight: 800; }
  .mp-currency { font-size: 0.78rem; color: #0098EA; font-weight: 600; margin-left: 3px; }
  .mp-purchased-label { font-size: 0.82rem; color: #2ECC71; }
  .mp-btn-buy {
    background: #0098EA; color: white; border: none; border-radius: 10px;
    padding: 9px 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .mp-btn-buy:hover:not(.mp-btn-disabled) { background: #006DB3; transform: scale(1.04); }
  .mp-btn-disabled { opacity: 0.5; cursor: not-allowed !important; }

  /* MODAL */
  .mp-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    backdrop-filter: blur(6px); z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 20px;
  }
  .mp-modal {
    background: var(--bg); border: 1px solid var(--border); border-radius: 24px;
    width: 100%; max-width: 480px; overflow: hidden;
    animation: mp-slideUp 0.3s ease;
  }
  @keyframes mp-slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
  .mp-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px; border-bottom: 1px solid var(--border);
  }
  .mp-modal-header h3 { font-size: 1.1rem; font-weight: 700; }
  .mp-modal-close {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--muted);
    font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
  }
  .mp-modal-body { padding: 24px; }

  /* Payment form */
  .mp-pay-product {
    display: flex; gap: 14px; align-items: center;
    margin-bottom: 20px; background: var(--bg-card); border-radius: 12px; padding: 14px;
  }
  .mp-pay-emoji { font-size: 2.5rem; }
  .mp-pay-info { flex: 1; }
  .mp-pay-name { font-weight: 700; font-size: 1rem; }
  .mp-pay-seller { font-size: 0.8rem; color: var(--muted); margin-top: 3px; }
  .mp-pay-amount { text-align: right; }
  .mp-amount-val { font-size: 1.4rem; font-weight: 800; }
  .mp-amount-cur { color: #0098EA; font-size: 0.8rem; }
  .mp-pay-balance {
    display: flex; justify-content: space-between; align-items: center;
    background: var(--bg-card); border-radius: 10px; padding: 12px 16px;
    margin-bottom: 20px; font-size: 0.83rem;
  }
  .mp-pay-balance span { color: var(--muted); }

  /* Steps */
  .mp-pay-steps { display: flex; flex-direction: column; margin-bottom: 20px; }
  .mp-step {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }
  .mp-step:last-child { border-bottom: none; }
  .mp-step-num {
    width: 32px; height: 32px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.8rem; font-weight: 700;
    background: var(--bg-card); border: 2px solid var(--border); color: var(--muted);
    flex-shrink: 0; transition: all 0.4s;
  }
  .mp-step-num.active { border-color: #0098EA; color: #0098EA; background: rgba(0,152,234,0.1); }
  .mp-step-num.done { border-color: #2ECC71; background: #2ECC71; color: white; }
  .mp-step-info { flex: 1; }
  .mp-step-title { font-size: 0.88rem; font-weight: 600; }
  .mp-step-sub { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }
  .mp-step-status { font-size: 0.78rem; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .mp-step-status.active { color: #0098EA; }
  .mp-step-status.done { color: #2ECC71; }

  .mp-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(0,152,234,0.2); border-top-color: #0098EA;
    border-radius: 50%; display: inline-block;
    animation: mp-spin 0.7s linear infinite;
  }
  @keyframes mp-spin { to { transform: rotate(360deg); } }

  .mp-error-box {
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
    color: #ef4444; border-radius: 10px; padding: 10px 16px;
    font-size: 0.85rem; margin-bottom: 16px;
  }

  .mp-btn-pay {
    width: 100%;
    background: linear-gradient(135deg, #0098EA, #006DB3);
    color: white; border: none; border-radius: 14px;
    padding: 16px; font-size: 1rem; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .mp-btn-pay:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 8px 24px rgba(0,152,234,0.3); }
  .mp-btn-processing { opacity: 0.7; cursor: not-allowed; }

  /* Success */
  .mp-success {
    display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px;
  }
  .mp-success-icon {
    width: 80px; height: 80px;
    background: rgba(46,204,113,0.15); border: 2px solid #2ECC71; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 2.5rem;
    animation: mp-pop 0.5s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes mp-pop { from { opacity:0; transform:scale(0.3); } to { opacity:1; transform:scale(1); } }
  .mp-success-title { font-size: 1.4rem; font-weight: 800; }
  .mp-success-sub { color: var(--muted); font-size: 0.9rem; line-height: 1.5; }
  .mp-tx-box {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px;
    padding: 12px 16px; width: 100%; text-align: left;
  }
  .mp-tx-label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .mp-tx-hash { font-family: monospace; font-size: 0.78rem; color: #0098EA; word-break: break-all; }
  .mp-tx-link {
    color: #0098EA; font-size: 0.85rem; text-decoration: none; font-weight: 600;
  }
  .mp-tx-link:hover { text-decoration: underline; }
  .mp-btn-close {
    width: 100%;
    background: var(--bg-card); border: 1px solid var(--border); color: var(--text);
    border-radius: 12px; padding: 13px; font-size: 0.92rem; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
  }
  .mp-btn-close:hover { border-color: #0098EA; color: #0098EA; }

  /* FOOTER */
  .mp-footer {
    text-align: center; padding: 32px 2rem; color: var(--muted);
    font-size: 0.82rem; border-top: 1px solid var(--border);
  }
`;
