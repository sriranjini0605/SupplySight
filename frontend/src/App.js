// src/App.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import ForceGraph2D from 'react-force-graph-2d';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [panel, setPanel] = useState({
    part: null,
    suppliers: [],
    risk: "",
    history: [],
    forecast: ""
  });

  useEffect(() => {
    axios.get("/api/graph/all").then((res) => {
      const data = { nodes: [], links: [] };
      res.data.forEach((r) => {
        data.nodes.push({ id: r.part, type: "part" });
        r.suppliers.forEach((s) => {
          data.nodes.push({ id: s, type: "supplier" });
          data.links.push({ source: r.part, target: s });
        });
      });
      setGraphData(data);
    });
  }, []);

  const onNodeClick = (node) => {
    if (node.type !== "part") return;
    const id = node.id;
    Promise.all([
      axios.get(`/api/graph/${id}`),
      axios.get(`/api/risk/${id}`),
      axios.get(`/api/forecast/${id}`)
    ]).then(([g, r, f]) => {
      setPanel({
        part:      g.data.part,
        suppliers: g.data.suppliers,
        risk:      r.data.text,
        history:   f.data.history,
        forecast:  f.data.forecast
      });
    });
  };

    return (
  <div
    style={{
      display: 'flex',
      height: '100vh',
      margin: 0,
      padding: 0,
      fontFamily: 'Arial, sans-serif'
    }}
  >
    {/* ─── LEFT: Graph (60%) ─────────────────────────── */}
    <div
      style={{
        flex: '0 0 60%',          // FIXED 60% width
        height: '100%',           // fill full viewport height
        borderRight: '1px solid #ddd',
        position: 'relative',     // anchor for absolute child
        overflow: 'hidden'        // clip overflow
      }}
    >
      <ForceGraph2D
        graphData={graphData}
        nodeAutoColorBy="type"
        onNodeClick={onNodeClick}

        // HERE is the key: make the canvas fill its parent
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      />
    </div>

    {/* ─── RIGHT: Details (40%) ─────────────────────── */}
    <div
      style={{
        flex: '1',                // remaining 40%
        padding: '20px',
        overflowY: 'auto',
        backgroundColor: '#fafafa'
      }}
    >
      {!panel.part ? (
        <p style={{ color: '#666' }}>
          Click on a <strong>Part</strong> node to see details here.
        </p>
      ) : (
        <>
          <h2 style={{ marginTop: 0, borderBottom: '1px solid #ddd' }}>
            Part: {panel.part}
          </h2>
          <h3>Suppliers</h3>
          <ul>
            {panel.suppliers.map(s => <li key={s}>{s}</li>)}
          </ul>
          <h3>Risk Summary</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{panel.risk}</p>
          <h3>Demand History</h3>
          <ul>
            {panel.history.map((q,i) => <li key={i}>Week {i+1}: {q}</li>)}
          </ul>
          <h3>Forecast</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{panel.forecast}</p>
        </>
      )}
    </div>
  </div>
);

}

export default App;
