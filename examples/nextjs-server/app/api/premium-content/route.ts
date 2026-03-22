import { paymentGate } from "@ton-x402/middleware";
import { getPaymentConfig } from "../../../lib/payment-config";

const jettonConfig = getPaymentConfig({
    amount: "10000000", // 0.01 BSA USD (9 decimals)
    asset: process.env.JETTON_MASTER_ADDRESS || "kQCd6G7c_HUBkgwtmGzpdqvHIQoNkYOEE0kSWoc5v57hPPnW",
    description: "Premium Content Access (0.01 BSA USD)",
    decimals: 9,
});

export const GET = paymentGate(async (req) => {
    return Response.json({
        success: true,
        content: "This is premium content only accessible after paying 1.0 Jetton!",
        secretCode: "JETTONS-ARE-AWESOME-" + Math.random().toString(36).substring(7),
    });
}, { config: jettonConfig });
