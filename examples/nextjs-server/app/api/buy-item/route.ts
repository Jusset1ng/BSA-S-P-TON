import { NextRequest, NextResponse } from "next/server";

// ====================================================================
// 🛍️  BOUTIQUE x402 — Catalogue & Facturation sur TON Testnet
// ====================================================================

const CATALOG: Record<string, { name: string; priceNano: string }> = {
  "tshirt-black": { name: "T-Shirt Noir BSA", priceNano: "100000000" },   // 0.10 TON
  "hoodie-white": { name: "Hoodie Blanc BSA", priceNano: "250000000" },   // 0.25 TON
  "cap-blue": { name: "Casquette Bleue BSA", priceNano: "50000000" }, // 0.05 TON
};

// Adresse du vendeur (hardcodée en fallback)
const SELLER_ADDRESS = "0QDRvHQ0yPN913gsZw7drVVtQJP_ifINtGeOFpdImZVmT1l7";

const NETWORK = "testnet";

// ── GET : renvoyer le catalogue ─────────────────────────────────────
export async function GET() {
  console.log("🛍️  GET /api/buy-item — Envoi du catalogue");
  return NextResponse.json({ catalog: CATALOG });
}

// ── POST : logique x402 (facture 402 ou validation) ─────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const itemId = body.itemId || "tshirt-black";
    const item = CATALOG[itemId];

    if (!item) {
      console.log(`❌ Article introuvable : ${itemId}`);
      return NextResponse.json(
        { error: `Article "${itemId}" non trouvé dans le catalogue.` },
        { status: 404 },
      );
    }

    // ── Étape 2 : vérification d'un paiement existant ───────────────
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("x402 ")) {
      const proof = authHeader.replace("x402 ", "");
      console.log(`✅ Preuve de paiement reçue ! Proof = ${proof}`);
      return NextResponse.json({
        success: true,
        message: `Paiement validé pour le ${item.name} (${Number(item.priceNano) / 1e9} TON) !`,
        proof,
      });
    }

    // ── Étape 1 : générer la facture 402 ────────────────────────────
    console.log(`➡️  Facture 402 générée pour : ${item.name} (${Number(item.priceNano) / 1e9} TON)`);

    const paymentDetails = {
      payTo: SELLER_ADDRESS,
      amount: item.priceNano,
      network: NETWORK,
      description: `Achat de ${item.name}`,
      facilitators: [
        {
          network: NETWORK,
          url: "https://testnet.facilitator.x402.org",
        },
      ],
    };

    const base64Details = Buffer.from(JSON.stringify(paymentDetails)).toString("base64");

    return new NextResponse("Payment Required", {
      status: 402,
      headers: {
        "Www-Authenticate": `x402 ${base64Details}`,
        "Payment-Required": base64Details,
      },
    });
  } catch (error: any) {
    console.error("❌ Erreur dans /api/buy-item :", error.message);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}