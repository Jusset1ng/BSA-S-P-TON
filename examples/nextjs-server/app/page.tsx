"use client";
import { useState, useEffect } from "react";

export default function SuperPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<any>(null);

  // Charger le catalogue au démarrage
  useEffect(() => {
    fetch("/api/buy-item", { method: "GET" })
      .then(res => {
        console.log("Catalogue fetch status:", res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("Catalogue data:", data);
        setCatalog(data.catalog);
      })
      .catch(err => {
        console.error("❌ Erreur chargement catalogue:", err);
        setCatalog(null);
      });
  }, []);

  const sendMessage = async () => {
    if (!message) return;
    setLoading(true);
    const newChat = [...chat, { role: "user", content: message }];
    setChat(newChat);
    setMessage("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        body: JSON.stringify({ messages: newChat }),
      });
      const data = await res.json();
      setChat([...newChat, { role: "assistant", content: data.response }]);
    } catch (e) {
      console.error("Erreur:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px", fontFamily: "sans-serif", height: "90vh" }}>
      
      {/* SECTION GAUCHE : LA BOUTIQUE (Le Marketplace) */}
      <div style={{ flex: 1, borderRight: "1px solid #eee", paddingRight: "20px" }}>
        <h2>🛒 Boutique BSA</h2>
        {catalog ? (
          Object.entries(catalog).map(([id, item]: any) => (
            <div key={id} style={{ border: "1px solid #ddd", padding: "10px", borderRadius: "8px", marginBottom: "10px" }}>
              <strong>{item.name}</strong>
              <p style={{ margin: "5px 0", color: "#666" }}>{item.description || "Édition limitée"}</p>
              <span style={{ color: "#28a745", fontWeight: "bold" }}>
                {Number(item.priceNano) / 1e9} TON
              </span>
            </div>
          ))
        ) : (
          <p>Chargement du catalogue...</p>
        )}
      </div>

      {/* SECTION DROITE : L'AGENT (Le Chat) */}
      <div style={{ flex: 2, display: "flex", flexDirection: "column" }}>
        <h2>🤖 Agent IA (DeepSeek)</h2>
        <div style={{ flex: 1, border: "1px solid #ccc", overflowY: "auto", padding: "15px", borderRadius: "8px", marginBottom: "10px" }}>
          {chat.map((msg, i) => (
            <div key={i} style={{ marginBottom: "10px", textAlign: msg.role === "user" ? "right" : "left" }}>
              <span style={{ display: "inline-block", padding: "8px 12px", borderRadius: "12px", background: msg.role === "user" ? "#007bff" : "#f1f1f1", color: msg.role === "user" ? "white" : "black" }}>
                {msg.content}
              </span>
            </div>
          ))}
          {loading && <p style={{ fontStyle: "italic", color: "#999" }}>L'agent analyse la boutique et prépare la transaction...</p>}
        </div>
        
        <div style={{ display: "flex", gap: "10px" }}>
          <input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Demande à l'IA d'acheter quelque chose..." 
            style={{ flex: 1, padding: "12px", borderRadius: "5px", border: "1px solid #ddd" }}
          />
          <button onClick={sendMessage} style={{ padding: "12px 20px", background: "#28a745", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            Envoyer
          </button>
        </div>
      </div>

    </div>
  );
}