import { NextResponse } from "next/server";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { WalletContractV5R1, TonClient } from "@ton/ton";
import {
    internal,
    external,
    beginCell,
    storeMessage,
    Address,
    SendMode,
} from "@ton/core";
import {
    type PaymentPayload,
    type PaymentDetails,
    generateQueryId,
} from "@ton-x402/core";

/**
 * POST /api/marketplace/purchase
 *
 * Executes a real x402 payment on the TON blockchain:
 * 1. Signs a BOC with the custodial wallet (guarded by passkey on client)
 * 2. Calls the facilitator /verify endpoint (offline BOC validation)
 * 3. Calls the facilitator /settle endpoint (broadcast + confirmation)
 * 4. Returns the real TX hash
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { productId, productName, price } = body;

        if (!productId || !price) {
            return NextResponse.json(
                { error: "Missing productId or price" },
                { status: 400 }
            );
        }

        // Convert price (human-readable) to atomic units (9 decimals)
        const atomicAmount = Math.round(parseFloat(price) * 1e9).toString();

        const mnemonic = process.env.WALLET_MNEMONIC;
        const payTo = process.env.PAYMENT_ADDRESS;
        const jettonMaster = process.env.JETTON_MASTER_ADDRESS;
        const facilitatorUrl = process.env.FACILITATOR_URL || "http://localhost:3000/api/facilitator";
        const rpcUrl = process.env.TON_RPC_URL || "https://testnet.toncenter.com/api/v2/jsonRPC";
        const network = (process.env.TON_NETWORK || "testnet") as "testnet" | "mainnet";

        // ── Demo mode if no mnemonic configured ──
        if (!mnemonic || mnemonic.includes("word1")) {
            // Simulate payment flow with realistic delays
            await delay(300);
            const fakeTxHash = Array.from({ length: 64 }, () =>
                "0123456789abcdef"[Math.floor(Math.random() * 16)]
            ).join("");

            return NextResponse.json({
                success: true,
                demo: true,
                txHash: fakeTxHash,
                product: productName,
                amount: price,
                network,
                steps: {
                    bocSigned: true,
                    verified: true,
                    settled: true,
                },
            });
        }

        // ── Real x402 payment flow ──

        // Step 1: Derive wallet from mnemonic
        const keypair = await mnemonicToPrivateKey(mnemonic.split(" "));
        const wallet = WalletContractV5R1.create({
            publicKey: keypair.publicKey,
            workchain: 0,
        });

        const client = new TonClient({
            endpoint: rpcUrl,
            apiKey: process.env.RPC_API_KEY,
        });

        const walletContract = client.open(wallet);
        const seqno = await walletContract.getSeqno();
        const queryId = generateQueryId();
        const fromAddress = wallet.address.toString({ bounceable: false });

        // Step 2: Create signed BOC
        const asset = jettonMaster || "TON";
        let transferMessage: ReturnType<typeof internal>;

        if (asset === "TON") {
            transferMessage = internal({
                to: Address.parse(payTo!),
                value: BigInt(atomicAmount),
                bounce: false,
                body: beginCell()
                    .storeUint(0, 32)
                    .storeStringTail(`x402:${queryId}`)
                    .endCell(),
            });
        } else {
            // Jetton transfer (TEP-74) — BSA USD
            const masterAddress = Address.parse(asset);
            const recipientAddress = Address.parse(payTo!);

            // Resolve sender's jetton wallet
            const res = await client.runMethod(masterAddress, "get_wallet_address", [
                { type: "slice", cell: beginCell().storeAddress(wallet.address).endCell() },
            ]);
            const senderJettonWallet = res.stack.readAddress();

            const jettonTransferBody = beginCell()
                .storeUint(0xf8a7ea5, 32)       // op::transfer
                .storeUint(BigInt(queryId), 64)   // query_id
                .storeCoins(BigInt(atomicAmount)) // amount
                .storeAddress(recipientAddress)    // destination
                .storeAddress(wallet.address)      // response_destination
                .storeMaybeRef(null)               // custom_payload
                .storeCoins(1_000_000n)            // forward_ton_amount (0.001 TON)
                .storeBit(0)                       // forward_payload: in-place
                .storeUint(0, 32)
                .storeStringTail(`x402:${queryId}`)
                .endCell();

            transferMessage = internal({
                to: senderJettonWallet,
                value: BigInt(70_000_000), // 0.07 TON gas
                bounce: true,
                body: jettonTransferBody,
            });
        }

        const transfer = (wallet as any).createTransfer({
            seqno,
            secretKey: keypair.secretKey,
            messages: [transferMessage],
            sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
        });

        const ext = external({
            to: wallet.address,
            init: seqno === 0 ? (wallet as any).init : undefined,
            body: transfer,
        });

        const cell = beginCell().store(storeMessage(ext)).endCell();
        const boc = cell.toBoc().toString("base64");

        console.log(`[x402] BOC signed for product ${productId}, queryId=${queryId}`);

        // Step 3: Build payloads
        const paymentPayload: PaymentPayload = {
            scheme: "ton-v1",
            network,
            boc,
            fromAddress,
            queryId,
        };

        const paymentDetails: PaymentDetails = {
            scheme: "ton-v1",
            network,
            amount: atomicAmount,
            asset,
            payTo: payTo!,
            facilitatorUrl,
            decimals: 9,
        };

        // Step 4: Facilitator verify (offline BOC validation)
        const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentPayload, paymentDetails }),
        });

        const verifyData = await verifyRes.json();
        console.log(`[x402] Verify result:`, verifyData);

        if (!verifyData.valid) {
            return NextResponse.json({
                success: false,
                error: `Verification failed: ${verifyData.reason || "unknown"}`,
                steps: { bocSigned: true, verified: false, settled: false },
            }, { status: 400 });
        }

        // Step 5: Facilitator settle (broadcast + poll for confirmation)
        const settleRes = await fetch(`${facilitatorUrl}/settle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentPayload, paymentDetails }),
        });

        const settleData = await settleRes.json();
        console.log(`[x402] Settle result:`, settleData);

        if (!settleData.success) {
            return NextResponse.json({
                success: false,
                error: `Settlement failed: ${settleData.error || "unknown"}`,
                steps: { bocSigned: true, verified: true, settled: false },
            }, { status: 400 });
        }

        // Step 6: Return real TX hash!
        return NextResponse.json({
            success: true,
            demo: false,
            txHash: settleData.txHash,
            product: productName,
            amount: price,
            network,
            queryId,
            fromAddress,
            steps: {
                bocSigned: true,
                verified: true,
                settled: true,
            },
        });
    } catch (e: any) {
        console.error("[x402] Purchase error:", e);
        return NextResponse.json(
            { error: e.message, success: false },
            { status: 500 }
        );
    }
}

function delay(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
}
