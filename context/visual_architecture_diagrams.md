# Rendered System Architecture & Data Flow Diagrams

Below are the rendered visual diagrams for the MediKiosk Platform architecture, sequence flows, and RAG pipeline.

---

## 1. High-Level System Context (C4 Level 1)

```mermaid
flowchart TD
    subgraph External_Actors["External Actors"]
        P["Patient (Low-literacy / Multi-lingual)"]
        D["Doctor (OPD Physician)"]
        Admin["Hospital Admin"]
    end

    subgraph MediKiosk_Platform["MediKiosk Platform"]
        API["API Gateway (Auth & Rate Limiting)"]
    end

    subgraph External_Integrations["External Integrations"]
        ABDM["ABDM Ecosystem (ABHA / HIE)"]
        HIS["Hospital HIS / EMR (FHIR R4)"]
    end

    P -->|Voice / Touch Input| API
    D -->|View Queue & Edit Summary| API
    Admin -->|Configure Settings & Analytics| API

    API -->|Push FHIR Bundle / Fetch Profile| ABDM
    API -->|Push Final Summary / Fetch MPI| HIS
```

---

## 2. Core Microservices Architecture

```mermaid
flowchart TB
    subgraph Client_Layer["Client Layer"]
        Mobile["React Native App (Patient)"]
        Web["React Web App (Doctor Dashboard)"]
    end

    subgraph Gateway_Layer["Gateway Layer"]
        GW["Kong / NGINX API Gateway"]
    end

    subgraph Service_Layer["FastAPI Microservices"]
        Conv["Conversation Service"]
        Doc["Document Service"]
        Sum["Summary Service"]
        Integ["Integration Service"]
        AdminSvc["Admin & Orchestration"]
    end

    subgraph AI_Layer["RAG + LangChain Engine"]
        Router["LangChain Router"]
        VectorDB[("Pinecone / Milvus Vector DB")]
        LLM["LLM Engine (GPT-4 / Gemini)"]
        ASR["Multi-lingual ASR"]
        TTS["Multi-lingual TTS"]
    end

    subgraph Data_Layer["Data Layer"]
        PG[("PostgreSQL (Structured Data)")]
        Mongo[("MongoDB (Conversation Logs)")]
        Redis[("Redis (Sessions & Cache)")]
        S3[("MinIO / S3 Storage")]
    end

    Mobile --> GW
    Web --> GW
    GW --> Conv
    GW --> Doc
    GW --> Sum
    GW --> Integ
    GW --> AdminSvc

    Conv --> ASR
    Conv --> TTS
    Conv --> Router
    Router --> VectorDB
    Router --> LLM
    Doc --> S3
    Doc --> PG
    Sum --> PG
    Sum --> Mongo
    Sum --> LLM
    Integ --> PG
    Integ --> ABDM["External ABDM"]
    Integ --> HIS["External HIS"]

    Conv -.-> Redis
    Sum -.-> Redis
```

---

## 3. End-to-End Full Data Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant Mobile as React Native App
    participant GW as API Gateway
    participant Conv as Conversation Service
    participant Doc as Document Service
    participant AI as RAG/LangChain Engine
    participant Sum as Summary Service
    participant Int as Integration Service
    participant DB as Database (PG/Redis)
    participant ABDM as ABDM/HIS System
    actor Doctor

    Patient->>Mobile: Opens App & Selects Language
    Mobile->>GW: Login via ABHA ID + OTP
    GW->>ABDM: Verify ABHA Credentials
    ABDM-->>GW: Valid Profile
    GW-->>Mobile: JWT Token + Profile Data

    Patient->>Mobile: Starts Intake Interview
    Mobile->>GW: POST /sessions (Allopathy/AYUSH)
    GW->>Conv: Initiate Intake Session
    Conv->>DB: Store Active Session State
    Conv-->>Mobile: Session ID Returned

    loop SOCRATES / Dashavidha Adaptive Interview
        Patient->>Mobile: Voice Input ("Left chest pain")
        Mobile->>GW: POST /conversation (Audio)
        GW->>Conv: Stream Audio
        Conv->>AI: ASR + Intent Extraction
        AI-->>Conv: Text & SOCRATES Entities
        Conv->>AI: Determine Next Follow-up Question
        AI-->>Conv: Generated Prompt ("Does pain radiate?")
        Conv-->>Mobile: TTS Audio + Button Options
        Mobile-->>Patient: Plays Audio & Displays Options
    end

    Patient->>Mobile: Scans Prescriptions / Reports
    Mobile->>GW: POST /documents (Multipart)
    GW->>Doc: Enqueue OCR Task (Celery)
    Doc->>AI: Multi-lingual OCR + NER Extraction
    AI-->>Doc: Extracted Drugs & Lab Values
    Doc->>DB: Save Document Records
    Doc-->>Mobile: Scan Complete Notification

    Patient->>Mobile: Taps "Submit Intake"
    Mobile->>GW: POST /sessions/finalize
    GW->>Sum: Trigger Summary Generation
    Sum->>DB: Fetch Full History & Documents
    Sum->>AI: RAG Context Retrieval
    AI->>Sum: Augmented Medical Context
    Sum->>AI: Synthesize Summary Draft
    AI-->>Sum: Structured JSON Clinical Summary
    Sum->>DB: Persist Draft Summary
    Sum-->>Mobile: Submission Success + Queue QR Code

    Note over Patient,Doctor: Patient Enters OPD Consultation Room

    Doctor->>Web: Opens Dashboard & Selects Patient
    Web->>GW: GET /physician/queue
    GW->>DB: Fetch Patient Summary
    GW-->>Web: Display Structured Summary & Alerts

    Doctor->>Web: Reviews Smart Summary (~30 seconds)
    Doctor->>Web: Edits Notes & Confirms Diagnosis
    Web->>GW: PUT /summary/confirm
    GW->>Int: Push Record to ABDM & HIS
    Int->>ABDM: Create FHIR Clinical Resources
    Int->>HIS: Update EMR Medical Record
    Int-->>GW: Sync Confirmed
    GW->>DB: Mark Status Completed & Flush Cache
    GW-->>Web: Success Confirmation
    Web-->>Doctor: Record Saved & Synced
```

---

## 4. RAG + LangChain Internal AI Pipeline

```mermaid
flowchart LR
    subgraph Input_Processing["Input Processing"]
        ConvText["Raw Conversation Text"]
        Docs["Digitized Documents"]
    end

    subgraph LangChain_Orchestrator["LangChain Orchestrator"]
        Retriever["Vector Retriever"]
        Prompt["Prompt Template Engine"]
        Parser["Structured Output Parser"]
    end

    subgraph Vector_Database["Vector Database"]
        Embed["Multilingual Embedding Model"]
        VectorDB[("Pinecone / Milvus Knowledge Base")]
    end

    subgraph LLM_Engine["LLM Engine"]
        Model["LLM (GPT-4 / Gemini)"]
    end

    subgraph Output["Output"]
        Summary["FHIR-Ready JSON Summary"]
        Draft["Draft for Doctor Review"]
    end

    ConvText --> Retriever
    Docs --> Retriever
    
    Retriever -->|Query Embedding| Embed
    Embed --> VectorDB
    VectorDB -->|Top K Contexts| Retriever

    Retriever -->|Clinical Guidelines| Prompt
    ConvText -->|Patient Dialogue| Prompt
    Prompt -->|Formatted Prompt| Model
    Model -->|Raw AI Output| Parser
    Parser -->|Validation & Guardrails| Summary
    Summary --> Draft
```
