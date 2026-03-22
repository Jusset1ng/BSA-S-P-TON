# 🤖 Alfred : Agent IA d'Achat Autonome (Protocole x402 sur TON)

Ce projet explore le futur des micro-transactions web en combinant l'Intelligence Artificielle et la blockchain TON. Il implémente "Alfred", un agent autonome capable de détecter, négocier et franchir des murs de paiement (paywalls via le code HTTP 402 Payment Required) sans intervention humaine constante.

---

## ✨ Fonctionnalités Clés

* **Paiement Autonome x402 :** L'Agent interagit directement avec les API et les boutiques en ligne, comprend les requêtes de paiement (factures 402) et signe les transactions sur la blockchain TON.
* **Burner Wallet (Portefeuille Prépayé) :** Pour une sécurité maximale, l'Agent opère via un portefeuille isolé généré spécifiquement pour lui. Les fonds principaux de l'utilisateur ne sont jamais exposés.
* **Garde-fous (Guardrails) Configurables :** L'utilisateur définit un plafond d'achat strict (ex: 1 TON maximum par transaction). Toute facture dépassant ce seuil est automatiquement bloquée par le système.
* **Interface Conversationnelle :** L'utilisateur donne des ordres simples en langage naturel ("Achète ce produit", "Débloque cet article") via un chat fluide géré par le Vercel AI SDK.

---

## 📂 Architecture du Projet

Voici l'arborescence principale des fichiers gérant l'Agent IA :

```text
📦 BSA-S-P-TON
 ┣ 📂 app
 ┃ ┣ 📂 api
 ┃ ┃ ┗ 📂 agent
 ┃ ┃   ┗ 📜 route.ts      # Logique backend de l'Agent IA (Vercel AI SDK, Tool Calling)
 ┃ ┣ 📂 setup
 ┃ ┃ ┗ 📜 page.tsx        # Interface de configuration (Burner Wallet & Limites de sécurité)
 ┃ ┣ 📜 layout.tsx
 ┃ ┗ 📜 page.tsx          # Interface de chat principale (Frontend)
 ┣ 📜 .env.local          # Variables d'environnement (Clés API IA, Configuration TON)
 ┣ 📜 package.json        # Dépendances du projet
 ┗ 📜 README.md
