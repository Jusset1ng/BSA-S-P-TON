# BSA Marketplace — x402 + Apple Passkey

Marketplace demo built on top of the BSA x TON hackathon starter. Lets users buy products using their TON wallet, authenticated via Apple Passkey (Face ID / Touch ID).

---

## How it works

1. User clicks **Connect with Passkey** → Face ID prompt → wallet connected
2. User picks a product → clicks **Buy Now**
3. Face ID prompt again to confirm payment
4. Server signs a TON transaction (BOC), sends it to the facilitator
5. Facilitator verifies the signature offline, broadcasts to TON
6. TX hash returned and displayed

---

## Setup

```bash
# 1. Clone and install
git clone https://github.com/Jusset1ng/BSA-S-P-TON.git
cd BSA-S-P-TON/examples/nextjs-server

# 2. Configure environment
cp .env.example .env.local
```

Fill in `.env.local`:

```env
PAYMENT_ADDRESS=your_ton_wallet_address
WALLET_MNEMONIC="word1 word2 ... word24"
RPC_API_KEY=your_toncenter_api_key
```

```bash
# 3. Run
pnpm dev
```

Open **http://localhost:3000/marketplace**

---

## Get testnet funds

- **TON (gas)** → Telegram bot [@testgiver_ton_bot](https://t.me/testgiver_ton_bot)
- **BSA USD** → [BSA USD Faucet](https://ton-x402-nextjs-server-dyvpwctew-hliosones-projects.vercel.app/)

---

## Files added

| File | Description |
|------|-------------|
| `app/marketplace/page.tsx` | Marketplace UI with Passkey flow |
| `app/api/wallet/route.ts` | Returns wallet address and balance |
| `app/api/marketplace/purchase/route.ts` | Signs BOC and calls facilitator |

---

## Stack

- Next.js 15 · TypeScript · TON SDK · WebAuthn API · x402 protocol
