# AI & RAG Implementation (LangChain & LLM Strategy)

## The RAG Pipeline (Retrieval-Augmented Generation)

1. **Ingestion**
   - Upload clinical guidelines, AYUSH classical texts (e.g., Charaka Samhita), and hospital-specific protocols into Vector DB (Pinecone/Milvus).
   - Embedding models: Multilingual MiniLM or OpenAI Embeddings via `LangChain`.

2. **Retrieval**
   - When a patient mentions specific symptoms (e.g., "joint pain with morning stiffness"), system retrieves relevant rheumatology or AYUSH (*Amavata*) clinical contexts.

3. **Synthesis**
   - Context retrieved from Vector DB + raw conversation transcript are fed into LLM (GPT-4 / Gemini Pro).
   - Orchestrated via LangChain `ConversationChain` to construct the clinical draft.

---

## Diagram: RAG + LangChain Internal AI Pipeline

```mermaid
flowchart LR
    subgraph Input_Processing
        ConvText[Raw Conversation Text]
        Docs[Digitized Documents]
    end

    subgraph LangChain_Orchestrator
        Retriever[Vector Retriever<br>Clinical Guidelines / AYUSH Texts]
        Prompt[Prompt Template Engine<br>System + Human + Context]
        Parser[Structured Output Parser<br>(Pydantic Validator)]
    end

    subgraph Vector_Database
        Embed[Embedding Model<br>(Multi-lingual)]
        VectorDB[(Pinecone/Milvus<br>Stored Clinical Knowledge)]
    end

    subgraph LLM_Engine
        Model[LLM (GPT-4/Gemini)]
    end

    subgraph Output
        Summary[FHIR-ready JSON Summary]
        Draft[Draft for Doctor Review]
    end

    ConvText --> Retriever
    Docs --> Retriever
    
    Retriever -- "Query Embedding" --> Embed
    Embed --> VectorDB
    VectorDB -- "Top K Similar Cases" --> Retriever

    Retriever -- "Retrieved Context" --> Prompt
    ConvText -- "Current Conversation" --> Prompt
    Prompt -- "Complete Prompt" --> Model
    Model -- "Raw AI Output" --> Parser
    Parser -- "Validation/Guardrails" --> Summary
    Summary --> Draft
```

---

## LangChain Specifics

- **`ConversationMemory` (BufferWindow)**: Retains the last 5 dialogue turns for immediate context awareness.
- **`StructuredOutputParser`**: Enforces strict JSON output conforming to the clinical summary schema (SOCRATES + Dashavidha Pariksha).
- **Guardrails**:
  - Uses `OutputFixingParser` and `PydanticValidator` to prevent LLM hallucinations on drug dosages.
  - If dosage or medication info is uncertain, flags the field as `"Unknown"`.
