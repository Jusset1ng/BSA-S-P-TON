import { NextResponse } from "next/server";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, TonClient } from "@ton/ton";
import { Address, beginCell } from "@ton/core";

/**
 * GET /api/wallet
 * Returns the wallet address and BSA USD balance derived from the mnemonic in env.
 * This is a custodial wallet: the server holds the keys, the passkey guards access.
 */
export async function GET() {
    try {
        const mnemonic = process.env.WALLET_MNEMONIC;
        if (!mnemonic || mnemonic.includes("word1")) {
            return NextResponse.json({
                address: "EQDemo...Address",
                balance: "47.25",
                network: "testnet",
                demo: true,
            });
        }

        const keypair = await mnemonicToPrivateKey(mnemonic.split(" "));
        const wallet = WalletContractV5R1.create({
            publicKey: keypair.publicKey,
            workchain: 0,
        });

        const address = wallet.address.toString({ bounceable: false, testOnly: true });

        // Try to get real balance
        let balance = "0.00";
        try {
            const rpcUrl = process.env.TON_RPC_URL || "https://testnet.toncenter.com/api/v2/jsonRPC";
            const client = new TonClient({
                endpoint: rpcUrl,
                apiKey: process.env.RPC_API_KEY,
            });

            const jettonMaster = process.env.JETTON_MASTER_ADDRESS;
            if (jettonMaster) {
                // Get Jetton (BSA USD) balance
                const masterAddress = Address.parse(jettonMaster);
                const res = await client.runMethod(masterAddress, "get_wallet_address", [
                    { type: "slice", cell: beginCell().storeAddress(wallet.address).endCell() },
                ]);
                const jettonWalletAddr = res.stack.readAddress();

                try {
                    const jettonData = await client.runMethod(jettonWalletAddr, "get_wallet_data", []);
                    const rawBalance = jettonData.stack.readBigNumber();
                    balance = (Number(rawBalance) / 1e9).toFixed(2);
                } catch {
                    // Jetton wallet doesn't exist yet (no balance)
                    balance = "0.00";
                }
            } else {
                // Fallback to native TON balance
                const rawBalance = await client.getBalance(wallet.address);
                balance = (Number(rawBalance) / 1e9).toFixed(4);
            }
        } catch (e) {
            console.error("Failed to fetch balance:", e);
            balance = "—";
        }

        return NextResponse.json({
            address,
            shortAddress: address.slice(0, 6) + "..." + address.slice(-4),
            balance,
            network: process.env.TON_NETWORK || "testnet",
            demo: false,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
