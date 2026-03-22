import { paymentGate } from "@ton-x402/middleware";
import { getPaymentConfig } from "../../../lib/payment-config";

const handler = (_request: Request) => {
    return Response.json({
        location: "Lausanne, Switzerland",
        temperature: 22,
        unit: "celsius",
        conditions: "Partly cloudy",
        humidity: 45,
        timestamp: new Date().toISOString(),
    });
};

export const GET = paymentGate(handler, {
    config: getPaymentConfig({
        amount: "10000000", // 0.01 BSA USD (9 decimals)
        asset: process.env.JETTON_MASTER_ADDRESS || "kQCd6G7c_HUBkgwtmGzpdqvHIQoNkYOEE0kSWoc5v57hPPnW",
        description: "Premium weather data (0.01 BSA USD)",
        decimals: 9,
    }),
});