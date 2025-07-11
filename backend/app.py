import os
from flask import Flask, jsonify
from dotenv import load_dotenv
from neo4j import GraphDatabase
import snowflake.connector
import pandas as pd
import boto3

# ─── Load environment variables ─────────────────────────────
load_dotenv()

# ─── Neo4j Aura configuration ──────────────────────────────
drv = GraphDatabase.driver(
    os.getenv("NEO4J_URI"),
    auth=(os.getenv("NEO4J_USER"), os.getenv("NEO4J_PASS"))
)

# ─── Snowflake connection factory ───────────────────────────
def sf_conn():
    return snowflake.connector.connect(
        account=os.getenv("SNOWFLAKE_ACCOUNT"),
        user=os.getenv("SNOWFLAKE_USER"),
        password=os.getenv("SNOWFLAKE_PASSWORD"),
        warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
        database=os.getenv("SNOWFLAKE_DATABASE"),
        schema=os.getenv("SNOWFLAKE_SCHEMA")
    )

# ─── Bedrock Runtime client ─────────────────────────────────
bedrock = boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION"))

app = Flask(__name__)

# ─── DEBUG: count your nodes ───────────────────────────────
@app.route("/api/graph/count")
def get_node_counts():
    with drv.session() as session:
        p = session.run("MATCH (p:Part) RETURN count(p) AS cnt").single().get("cnt")
        s = session.run("MATCH (s:Supplier) RETURN count(s) AS cnt").single().get("cnt")
    return jsonify(parts=p, suppliers=s)

# ─── Full graph ───────────────────────────────────────────
@app.route("/api/graph/all")
def get_all_graph():
    with drv.session() as session:
        results = session.run(
            """
            MATCH (p:Part)-[:SUPPLIED_BY]->(s:Supplier)
            RETURN 
              p.partId      AS part,
              p.partName    AS name,
              collect(s.supplierName) AS suppliers
            """
        )
        data = [r.data() for r in results]
    return jsonify(data)

# ─── Per‐part graph ───────────────────────────────────────
def get_graph_record(part_id):
    with drv.session() as session:
        rec = session.run(
            """
            MATCH (p:Part {partId:$pid})-[:SUPPLIED_BY]->(s:Supplier)
            RETURN
              p.partId      AS part,
              p.partName    AS name,
              collect(s.supplierName) AS suppliers
            """,
            pid=part_id
        ).single()
    return rec.data() if rec else {"part": part_id, "name": "", "suppliers": []}

@app.route("/api/graph/<part_id>")
def get_graph(part_id):
    return jsonify(get_graph_record(part_id))

# ─── Endpoint: risk summary via Bedrock converse ────────────
@app.route("/api/risk/<part_id>")
def get_risk(part_id):
    graph = get_graph_record(part_id)
    prompt_text = (
        f"Part {part_id} is supplied by {graph['suppliers']}. "
        "If one supplier fails, what risk does Caterpillar face?"
    )
    messages = [
      {
        "role": "user",
        "content": [{"text": "You are a supply chain AI expert. " + prompt_text}]
      }
    ]
    inference_config = {"maxTokens": 256, "temperature": 0.2}

    resp = bedrock.converse(
        modelId=os.getenv("BEDROCK_MODEL_ID"),
        messages=messages,
        inferenceConfig=inference_config
    )
    assistant_msg = resp["output"]["message"]["content"][0]["text"]
    return jsonify(text=assistant_msg)

# ─── Helper: query Snowflake demand history ─────────────────
def query_history(part_id):
    conn = sf_conn()
    df = pd.read_sql(
        "SELECT WEEK_START, QTY FROM PART_DEMAND "
        "WHERE PART_ID=%s ORDER BY WEEK_START DESC LIMIT 8",
        conn, params=(part_id,)
    )
    return df.sort_values("WEEK_START")["QTY"].tolist()

# ─── Endpoint: forecast via Bedrock converse ────────────────
@app.route("/api/forecast/<part_id>")
def get_forecast(part_id):
    history = query_history(part_id)
    prompt_text = (
        f"Historical weekly demand for part {part_id}: {history}. "
        "Forecast the next 4 weeks."
    )
    messages = [
      {
        "role": "user",
        "content": [{"text": "You are an expert forecast assistant. " + prompt_text}]
      }
    ]
    inference_config = {"maxTokens": 100, "temperature": 0.2}

    resp = bedrock.converse(
        modelId=os.getenv("BEDROCK_MODEL_ID"),
        messages=messages,
        inferenceConfig=inference_config
    )
    forecast_text = resp["output"]["message"]["content"][0]["text"]
    return jsonify(history=history, forecast=forecast_text)

if __name__ == "__main__":
    if not os.getenv("BEDROCK_MODEL_ID"):
        raise RuntimeError(
            "Please set BEDROCK_MODEL_ID in your .env, e.g. us.anthropic.claude-3-haiku-20240307-v1:0"
        )
    app.run(port=5000, debug=True)
