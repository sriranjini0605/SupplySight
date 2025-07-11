# SupplySight ([Live Web App](https://supplysight-1.onrender.com/))

SupplySight is an interactive supply-chain intelligence dashboard that lets you:

- Visualize parts-to-suppliers relationships with a Neo4j graph  
- Generate AI-powered risk summaries and demand forecasts via AWS Bedrock (Claude 3.5 Haiku)  
- Query the system through a natural-language chatbot backed by a Bedrock Agent  
- Persist historical demand in Snowflake and part/supplier data in Neo4j Aura  

## Tech Stack

- **Frontend:** React + react-force-graph-2d  
- **Backend:** Python Flask  
- **Graph DB:** Neo4j Aura (cloud)  
- **Data Warehouse:** Snowflake  
- **AI & Agents:** AWS Bedrock (Claude 3.5 Haiku) + Bedrock Agents  
- **Packaging:** Docker (optional)  

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sriranjini0605/SupplySight.git
cd SupplySight
```

### 2. Set up the backend

1. Create a virtual environment and install requirements:
   ```bash
   python -m venv .venv
   source .venv/bin/activate        # macOS/Linux
   .venv\Scripts\activate.bat     # Windows
   pip install -r requirements.txt
   ```
2. Create `.env` and fill in your credentials:
   ```
   NEO4J_URI=neo4j+s://<YOUR_AURA_URI>
   NEO4J_USER=<USERNAME>
   NEO4J_PASS=<PASSWORD>

   SNOWFLAKE_ACCOUNT=<ACCOUNT>
   SNOWFLAKE_USER=<USER>
   SNOWFLAKE_PASSWORD=<PASSWORD>
   SNOWFLAKE_WAREHOUSE=<WAREHOUSE>
   SNOWFLAKE_DATABASE=<DATABASE>
   SNOWFLAKE_SCHEMA=<SCHEMA>

   AWS_REGION=us-east-2
   BEDROCK_MODEL_ID=us.anthropic.claude-3-haiku-20240307-v1:0
   BEDROCK_AGENT_ID=<YOUR_AGENT_ID>
   BEDROCK_AGENT_ALIAS_ID=<YOUR_AGENT_ALIAS_ID>
   ```
3. Launch the Flask server:
   ```bash
   gunicorn --bind 0.0.0.0:5000 app:app
   ```

### 3. Set up the frontend

1. Change into the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies and start:
   ```bash
   npm install
   npm start
   ```
3. Open your browser to [http://localhost:3000](http://localhost:3000).

## API Endpoints

### Graph & Analytics

| Method | Endpoint                 | Description                                          |
| ------ | ------------------------ | ---------------------------------------------------- |
| GET    | `/api/graph/all`         | List all parts with their suppliers                  |
| GET    | `/api/graph/:part_id`    | Get a single part’s name and its suppliers           |
| GET    | `/api/risk/:part_id`     | AI-generated risk summary (via Claude 3.5 Haiku)     |
| GET    | `/api/forecast/:part_id` | Historical demand and 4-week forecast (via Bedrock)  |

### Chat

| Method | Endpoint    | Payload                                   | Response                             |
| ------ | ----------- | ----------------------------------------- | ------------------------------------ |
| POST   | `/api/chat` | `{ "message": string, "sessionId": string }` | `{ "reply": string, "sessionId": string }` |


## Usage

1. Click a **Part** node in the graph to view details.  
2. Switch to **Chat** to ask natural-language questions about traceability, risk, or forecasts.  
3. The chat preserves context via `sessionId`.

## Links

- React Force-Graph: https://github.com/vasturiano/react-force-graph  
- Neo4j Aura: https://neo4j.com/cloud/aura/  
- Snowflake: https://www.snowflake.com/  
- AWS Bedrock: https://aws.amazon.com/bedrock/
