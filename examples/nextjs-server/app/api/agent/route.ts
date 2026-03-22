import { NextRequest, NextResponse } from "next/server";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV4, TonClient } from "@ton/ton";
import { internal } from "@ton/core";

// ====================================================================
// 🤖  AGENT IA — Achat autonome sur TON Testnet via x402 Manuel
// ====================================================================

// --- Configuration (utilise les noms exacts du .env.local) -----------
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
const WALLET_MNEMONIC = process.env.WALLET_MNEMONIC!;
const TON_RPC_URL =
  process.env.TON_RPC_URL || "https://testnet.toncenter.com/api/v2/jsonRPC";
const RPC_API_KEY = process.env.RPC_API_KEY || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// --- Types DeepSeek --------------------------------------------------
interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
}

// --- TonClient singleton ---------------------------------------------
function getTonClient(): TonClient {
  return new TonClient({
    endpoint: TON_RPC_URL,
    apiKey: RPC_API_KEY || undefined,
  });
}

// --- Wallet cache (initialisé une seule fois) ------------------------
let walletCache: {
  wallet: WalletContractV4;
  keyPair: { publicKey: Buffer; secretKey: Buffer };
  address: string;
} | null = null;

async function getBurnerWallet() {
  if (walletCache) return walletCache;
  const mnemonic = WALLET_MNEMONIC.split(/\s+/).filter((w: string) => w.length > 0);
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  walletCache = {
    wallet,
    keyPair,
    address: wallet.address.toString(),
  };
  console.log(`🤖 Burner Wallet initialisé : ${walletCache.address}`);
  return walletCache;
}

// ====================================================================
// 🛒  OUTIL : Acheter un article (vraie transaction TON)
// ====================================================================
async function executeBuyItem(input: {
  itemId: string;
  quantity?: number;
}): Promise<string> {
  const { wallet, keyPair } = await getBurnerWallet();
  const tonClient = getTonClient();
  const walletContract = tonClient.open(wallet);

  const requestBody = JSON.stringify({
    itemId: input.itemId,
    quantity: input.quantity || 1,
  });

  try {
    // ── 1. Demande à la boutique ────────────────────────────────────
    console.log(`\n🚀 Agent : Demande d'achat pour "${input.itemId}"...`);
    const response = await fetch(`${APP_URL}/api/buy-item`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    // ── 2. Si ce n'est PAS un 402, retourner directement ────────────
    if (response.status !== 402) {
      const data = await response.json();
      console.log("ℹ️  Réponse directe (pas de 402) :", data);
      return `Réponse de la boutique : ${JSON.stringify(data)}`;
    }

    // ── 3. Intercepter le 402 → lire la facture ─────────────────────
    console.log("➡️  Facture 402 reçue ! Décodage en cours...");
    const paymentRequiredB64 = response.headers.get("Payment-Required");
    if (!paymentRequiredB64) {
      return "❌ Erreur : header Payment-Required manquant dans la réponse 402.";
    }

    const paymentDetails = JSON.parse(
      Buffer.from(paymentRequiredB64, "base64").toString("utf-8"),
    );

    const dest: string = paymentDetails.payTo;
    const amountNano: string = paymentDetails.amount;
    const amountTON = Number(amountNano) / 1e9;

    console.log(`💰 Montant : ${amountTON} TON (${amountNano} nano)`);
    console.log(`📍 Destinataire : ${dest}`);

    // ── 4. Préparer & envoyer la vraie transaction TON ──────────────
    const balance = await walletContract.getBalance();
    const requiredAmount = BigInt(amountNano);
    const feeBuffer = 50000000n; // 0.05 TON buffer for gas

    if (balance < requiredAmount + feeBuffer) {
      const err = `❌ Erreur : Solde insuffisant. Solde actuel: ${Number(balance) / 1e9} TON, requis: ${Number(requiredAmount + feeBuffer) / 1e9} TON`;
      console.log(err);
      return err;
    }

    const seqno = await walletContract.getSeqno();
    console.log(`🔢 Seqno actuel du wallet : ${seqno}`);

    const transfer = walletContract.createTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages: [
        internal({
          to: dest,
          value: requiredAmount,
          bounce: false,
          body: undefined,
        }),
      ],
    });

    console.log("📤 Envoi de la transaction sur TON Testnet...");
    await walletContract.send(transfer);
    console.log(`✅ Transaction envoyée ! seqno = ${seqno}`);

    // ── 5. Attendre la propagation (quelques secondes) ──────────────
    console.log("⏳ Attente de propagation (8 secondes)...");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // Vérification que le seqno a bien augmenté (transaction confirmée par le réseau)
    const newSeqno = await walletContract.getSeqno();
    if (newSeqno === seqno) {
      const err = `❌ Erreur : La transaction n'a pas pu être confirmée sur la blockchain (seqno inchangé).`;
      console.log(err);
      return err;
    }

    // ── 6. Confirmer auprès de la boutique ──────────────────────────
    const proof = `transaction_reelle_seqno_${seqno}`;
    console.log(`🔁 Renvoi avec Authorization: x402 ${proof}`);

    const confirmResponse = await fetch(`${APP_URL}/api/buy-item`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `x402 ${proof}`,
      },
      body: requestBody,
    });

    const result = await confirmResponse.json();
    console.log("✅ Réponse de la boutique :", result);

    // ── 7. Retourner du TEXTE BRUT (pas JSON) pour le LLM ──────────
    return `✅ Succès ! Achat de "${input.itemId}" validé.\n` +
      `Montant payé : ${amountTON} TON\n` +
      `Seqno : ${seqno}\n` +
      `Message boutique : ${result.message || "Paiement confirmé"}`;
  } catch (error: any) {
    console.error("❌ Erreur lors de l'achat :", error.message || error);
    return `❌ Erreur lors de l'achat de "${input.itemId}" : ${error.message || String(error)}`;
  }
}

// ====================================================================
// 📋  OUTIL : Récupérer le catalogue
// ====================================================================
async function executeGetCatalog(): Promise<string> {
  try {
    const response = await fetch(`${APP_URL}/api/buy-item`);
    const data = await response.json();
    console.log("📋 Catalogue récupéré :", data);
    return JSON.stringify(data);
  } catch (error: any) {
    return `❌ Erreur catalogue : ${error.message}`;
  }
}

// ====================================================================
// 🧰  Définition des outils pour DeepSeek
// ====================================================================
const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "buy_item_for_user",
      description:
        "Achète un article de la boutique BSA en payant avec le Burner Wallet TON via le protocole x402. Le paiement est réel sur le testnet TON.",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            enum: ["tshirt-black", "hoodie-white", "cap-blue"],
            description: "L'identifiant de l'article à acheter",
          },
          quantity: {
            type: "number",
            description: "Quantité (par défaut 1)",
          },
        },
        required: ["itemId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_catalog",
      description:
        "Récupère la liste des articles disponibles dans la boutique BSA avec leurs prix en TON.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `Tu es un assistant d'achat intelligent de la boutique BSA. 
Tu disposes d'un Burner Wallet TON sur le testnet pour payer les articles.
Quand l'utilisateur demande d'acheter un article, utilise l'outil buy_item_for_user.
Tu peux aussi montrer le catalogue avec get_catalog.
Réponds toujours en français. Sois concis et enthousiaste.`;

// ====================================================================
// 🚀  Handler principal POST /api/agent
// ====================================================================
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    console.log("\n🚀 ═══════════════════════════════════════════════");
    console.log("🤖 Nouvelle requête Agent IA reçue");
    console.log("═══════════════════════════════════════════════════");

    let apiMessages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    let response = await callDeepSeek(apiMessages);
    let choice = response.choices[0];

    // Boucle d'exécution des outils
    while (choice.finish_reason === "tool_calls") {
      apiMessages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`\n🧰 Outil appelé : ${toolName}`, args);

        let result: string;
        if (toolName === "buy_item_for_user") {
          result = await executeBuyItem(args);
        } else if (toolName === "get_catalog") {
          result = await executeGetCatalog();
        } else {
          result = `Outil inconnu : ${toolName}`;
        }

        apiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      response = await callDeepSeek(apiMessages);
      choice = response.choices[0];
    }

    console.log("✅ Réponse finale de l'Agent :", choice.message.content);
    return NextResponse.json({ response: choice.message.content });
  } catch (error: any) {
    console.error("❌ Erreur Agent :", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur interne de l'agent" },
      { status: 500 },
    );
  }
}

// ====================================================================
// 📡  Appel DeepSeek (compatible OpenAI)
// ====================================================================
async function callDeepSeek(messages: Message[]) {
  const baseUrl =
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  console.log(`📡 Appel DeepSeek (${model})...`);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ Erreur DeepSeek :", errorText);
    throw new Error(`DeepSeek API error: ${res.status} — ${errorText}`);
  }

  return res.json();
}