import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import ForceGraph2D from "react-force-graph-2d";
import "./App.css";

// Hook to measure a DOM node’s size
function useResize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      });
    });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return size;
}

function Spinner() {
  return (
    <div className="spinner-container">
      <div className="spinner" />
    </div>
  );
}

function ChatPane({
  messages,
  setMessages,
  sessionId,
  setSessionId,
  chatLoading,
  setChatLoading,
}) {
  const [input, setInput] = useState("");

  const send = async () => {
    if (!input.trim()) return;
    const txt = input.trim();

    // Push user message
    setMessages((m) => [...m, { from: "user", text: txt }]);
    setInput("");
    setChatLoading(true);

    try {
      const payload = { message: txt };
      if (sessionId) payload.sessionId = sessionId;

      const res = await axios.post("/api/chat", payload);
      if (res.data.sessionId) setSessionId(res.data.sessionId);

      setMessages((m) => [
        ...m,
        { from: "bot", text: res.data.reply || "No reply" },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { from: "bot", text: "⚠️ Sorry, something went wrong." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const onEnter = (e) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="chat-container">
      <div className="chat-history">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-message ${m.from === "user" ? "user" : "bot"}`}
          >
            {m.text}
          </div>
        ))}
        {chatLoading && <div className="chat-message bot">…thinking…</div>}
      </div>
      <div className="chat-input-row">
        <input
          placeholder="Ask something…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onEnter}
          disabled={chatLoading}
        />
        <button onClick={send} disabled={chatLoading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [panel, setPanel] = useState({
    part: "",
    partName: "",
    suppliers: [],
    risk: "",
    history: [],
    forecast: "",
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const fgRef = useRef();
  const wrapperRef = useRef();
  const { width, height } = useResize(wrapperRef);

  // Load full graph on mount
  useEffect(() => {
    axios
      .get("/api/graph/all")
      .then((res) => {
        const map = {},
          links = [];
        res.data.forEach(({ part, name, suppliers }) => {
          if (!map[part]) map[part] = { id: part, type: "part", name };
          suppliers.forEach((s) => {
            if (!map[s]) map[s] = { id: s, type: "supplier", name: s };
            links.push({ source: part, target: s });
          });
        });
        setGraphData({ nodes: Object.values(map), links });
      })
      .catch(console.error);
  }, []);

  // When a part node is clicked
  const onNodeClick = (node) => {
    if (node.type !== "part") return;
    setDetailsLoading(true);
    Promise.all([
      axios.get(`/api/graph/${node.id}`),
      axios.get(`/api/risk/${node.id}`),
      axios.get(`/api/forecast/${node.id}`),
    ])
      .then(([g, r, f]) => {
        setPanel({
          part: g.data.part,
          partName: g.data.name,
          suppliers: g.data.suppliers,
          risk: r.data.text,
          history: f.data.history,
          forecast: f.data.forecast,
        });
        setActiveTab("details");
        fgRef.current.zoomToFit(400);
      })
      .catch(console.error)
      .finally(() => setDetailsLoading(false));
  };

  return (
    <div className="app-container">
      {/* ── Graph Pane ────────────────────────── */}
      <div className="graph-pane">
        <div className="graph-wrapper" ref={wrapperRef}>
          {width > 0 && height > 0 && (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              width={width}
              height={height}
              nodeAutoColorBy="type"
              nodeLabel={(n) =>
                n.type === "part" ? `Part: ${n.name}` : `Supplier: ${n.name}`
              }
              onNodeClick={onNodeClick}
            />
          )}
          <div className="legend">
            <div>
              <span className="legend-dot supplier" /> Supplier
            </div>
            <div>
              <span className="legend-dot part" /> Part
            </div>
          </div>
        </div>
      </div>

      {/* ── Details / Chat Panel ─────────────────── */}
      <div className="panel-pane">
        <div className="tabs">
          <button
            className={activeTab === "details" ? "active" : ""}
            onClick={() => setActiveTab("details")}
            disabled={chatLoading}
          >
            Details
          </button>
          <button
            className={activeTab === "chat" ? "active" : ""}
            onClick={() => setActiveTab("chat")}
            disabled={detailsLoading}
          >
            Chat
          </button>
        </div>

        {detailsLoading ? (
          <Spinner />
        ) : activeTab === "details" ? (
          <div className="details">
            {!panel.part ? (
              <div className="placeholder">
                Click on a <strong>Part</strong> node to see details.
              </div>
            ) : (
              <>
                <h2>
                  {panel.partName} ({panel.part})
                </h2>
                <h3>Suppliers</h3>
                <ul>
                  {panel.suppliers.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <h3>Risk Summary</h3>
                <p>{panel.risk}</p>
                <h3>Demand History</h3>
                <ul>
                  {panel.history.map((q, i) => (
                    <li key={i}>
                      Week {i + 1}: {q}
                    </li>
                  ))}
                </ul>
                <h3>Forecast</h3>
                <p>{panel.forecast}</p>
              </>
            )}
          </div>
        ) : (
          <ChatPane
            messages={messages}
            setMessages={setMessages}
            sessionId={sessionId}
            setSessionId={setSessionId}
            chatLoading={chatLoading}
            setChatLoading={setChatLoading}
          />
        )}
      </div>
    </div>
  );
}

export default App;
