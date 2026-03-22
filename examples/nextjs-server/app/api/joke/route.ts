import { paymentGate } from "@ton-x402/middleware";
import { getPaymentConfig } from "../../../lib/payment-config";

// Le handler définit ce qui se passe UNE FOIS que le paiement est validé
const handler = async (req: Request) => {
    try {
        const body = await req.json();
        const { itemName, category } = body;

        // Ici, vous pourriez ajouter une logique pour enregistrer la commande en base de données
        return Response.json({ 
            success: true, 
            message: `Commande confirmée pour l'objet : ${itemName}`,
            category: category || "Divers",
            orderId: Math.random().toString(36).substring(7).toUpperCase(),
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        return Response.json({ error: "Données de commande invalides" }, { status: 400 });
    }
};

// On utilise POST car une commande implique l'envoi de données (nom de l'objet, etc.)
export const POST = paymentGate(handler, {
    config: getPaymentConfig({
        amount: "50000000", // Exemple : 0.05 BSA USD (9 décimales)
        asset: process.env.JETTON_MASTER_ADDRESS || "kQCd6G7c_HUBkgwtmGzpdqvHIQoNkYOEE0kSWoc5v57hPPnW",
        description: "Paiement Marketplace x402",
        decimals: 9,
    }),
});