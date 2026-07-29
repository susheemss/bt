# AI Planning Agent — Client Brief
### Decision Intelligence AI Platform · BT Retail Supply Chain

---

## What is the AI Agent?

The AI Agent is an **autonomous planning assistant** that monitors your BT store network 24/7. Unlike the AI Advisor (which answers questions when asked), the Agent **acts proactively** — it watches for exceptions, makes decisions, and either executes them automatically or brings them to you for approval.

Think of it as a junior supply chain analyst who never sleeps and never misses a threshold breach.

---

## How is it different from the AI Advisor?

| | AI Advisor | AI Agent |
|---|---|---|
| **Mode** | Reactive — you ask, it answers | Proactive — it watches and alerts |
| **Action** | Gives recommendations | Can execute decisions |
| **Human role** | Always in control | Approves or rejects agent actions |
| **Best for** | One-off planning questions | Continuous exception management |

---

## What does the Agent monitor? (3 pre-configured tasks)

### 1. Service Level Watchdog
- Continuously monitors SL % across all 5 BT stores
- **Triggers when:** any store drops below 97% service level
- **Action:** Generates an expedite replenishment plan and raises it for planner approval

### 2. Lane Consolidation Optimiser
- Watches DC→store delivery lanes for consolidation opportunities
- **Triggers when:** combined truck fill on two lanes would exceed 85% if merged
- **Action:** Proposes a consolidated FTL dispatch — saves freight cost

### 3. Dead Stock Detector
- Monitors SKU sell-through rates across all stores
- **Triggers when:** a SKU has more than 4 weeks of supply at current demand
- **Action:** Flags the SKU, calculates capital tied up, proposes redeployment or markdown

---

## How does approval work?

The Agent operates on a **human-in-the-loop** model:

1. Agent detects an exception
2. It analyses the situation and proposes an action
3. A **Pending Approval** card appears in the Agent panel
4. The planner reviews and clicks **Approve** or **Reject**
5. If approved, the action is executed and logged
6. Everything is recorded in the Activity Log with timestamps

**The planner is always in control. The agent never acts without permission on high-impact decisions.**

---

## What does the Activity Log show?

A real-time timestamped record of everything the agent has done — demand sensing cycles completed, SKUs flagged, SL breaches detected, lane opportunities identified. Full audit trail for every shift.

---

## What will it do in the live product?

In the production version (connected to real BT data), the agent will:

- Connect to live POS sell-through data from BT stores
- Read DC inventory in real time
- Trigger replenishment orders automatically when within pre-agreed rules
- Send WhatsApp/email alerts to planners for urgent approvals
- Learn from planner decisions over time (approved vs rejected) to improve its recommendations
- Operate across 24-hour cycles with configurable escalation rules

---

## How is the Agent built technically?

**What BT will likely ask:** *"Did you use LangChain? What technology is behind this?"*

### Current state (this demo)
The prototype you are seeing today is built in **HTML + JavaScript** — a front-end demonstration of the concept and user experience. There is no live AI model behind it yet. It is designed to show BT *what it will do*, not how it currently works under the hood.

### Production build (what we will build)

We will **not use LangChain**. Here is why and what we will use instead:

| Component | Technology | Why |
|---|---|---|
| **AI brain** | Anthropic Claude API (claude-opus-4 or claude-sonnet-4) | Best reasoning for supply chain decisions; native tool-use capability |
| **Agent orchestration** | Anthropic Tool Use API (direct) | No need for LangChain — Claude natively supports function calling, which is all an agent needs |
| **Backend** | Python (FastAPI) | Fast, lightweight, connects to BT's existing systems |
| **Database** | PostgreSQL | Stores store × SKU × week demand data, agent decision history |
| **Triggers** | Scheduled jobs (cron) + event-based (webhooks from BT's POS/WMS) | Agent runs on a schedule and also fires when a live signal arrives |
| **Integrations** | REST APIs to BT's SAP / WMS / POS systems | Reads real inventory and writes approved orders back |
| **Notifications** | Email / Teams / WhatsApp Business API | Delivers approval requests to the right planner |

### Why not LangChain?
LangChain is a framework that was popular in 2023 but adds significant complexity. For this use case, **Claude's native Tool Use API is simpler, more reliable, and directly supported by Anthropic**. The agent works like this:

1. Claude receives a context prompt: *"Here is the current BT network data. Your job is to detect exceptions and propose actions."*
2. Claude calls **tools** (Python functions) — e.g. `get_store_service_levels()`, `check_rop_breaches()`, `generate_replenishment_order()`
3. Each tool reads from the BT database and returns structured data
4. Claude reasons over the results and produces a structured recommendation
5. The recommendation is sent to the planner via the approval workflow
6. If approved, another tool `release_drp_order()` writes back to the system

This is a **standard agentic loop** — no LangChain required.

### What makes this a "real" agent vs a chatbot?
- It **runs on a schedule** without a human prompting it
- It has **access to tools** (read/write to live systems)
- It **makes decisions** based on rules + AI reasoning
- It maintains a **memory** of past decisions to improve over time
- It **escalates** appropriately — autonomous for low-risk, human approval for high-risk

---

## Key message for BT

> *"This agent reduces the manual exception-management workload by approximately 60–70%. Your planners stop chasing alerts and start making decisions. The agent handles the monitoring — the planner handles the judgement calls."*

**On the technology question:**
> *"We build directly on Anthropic's Claude API — the same model that powers Claude.ai. We do not use LangChain as it adds unnecessary complexity. The agent is a Python backend with Claude as the reasoning engine, connected directly to your existing SAP and WMS systems via APIs."*

---

*Document prepared for BT client presentation · Decision Intelligence AI Platform*
