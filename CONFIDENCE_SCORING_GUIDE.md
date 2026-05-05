# Confidence Scoring in Voice RAG

## Overview

The Voice RAG system uses a sophisticated **4-factor confidence scoring formula** to measure how confident the AI is in its answers. Even when answers are factually correct, the confidence score reflects the quality and relevance of the supporting evidence, not just correctness.

---

## The Confidence Formula

```
Confidence Score = (0.55 × top_confidence) + (0.25 × avg_confidence) + (0.15 × coverage) + (0.05 × agreement)
```

This weighted formula is implemented in [backend/main.py](backend/main.py#L345).

### **Component Breakdown**

#### **1. Top Confidence (55% weight) - Most Important**

**What it measures:** The similarity score of the **best matching source document** to your query.

- **Range:** 0.0 to 1.0 (from Qdrant vector database)
- **How it works:** The embedding model compares your question to all documents and returns similarity scores. The highest score becomes the "top confidence."
- **Example:** If the best matching document scores 0.6 similarity:
  - Contribution = 0.55 × 0.6 = **0.33**

**Why it matters:** If no good source matches your query, confidence drops immediately.

---

#### **2. Average Confidence (25% weight) - Secondary**

**What it measures:** The average similarity score across **all retrieved sources** (default: 3 sources).

- **Calculation:** Sum of similarity scores ÷ Number of sources
- **Example:** If 3 sources score [0.6, 0.5, 0.4]:
  - Average = 0.5
  - Contribution = 0.25 × 0.5 = **0.125**

**Why it matters:** It checks if multiple sources support the answer, not just one. If only 1 document is relevant but 2 others aren't, confidence drops.

---

#### **3. Coverage (15% weight) - Token Overlap**

**What it measures:** What percentage of words in your **generated answer** appear in the source documents.

- **How it works:**
  1. Break answer into unique words (tokens)
  2. Break all retrieved documents into words
  3. Calculate: (overlapping words) ÷ (total answer words)
- **Example:** Your answer has 20 unique words, but only 12 appear in sources:
  - Coverage = 12 ÷ 20 = 0.6 (60%)
  - Contribution = 0.15 × 0.6 = **0.09**

**Why it matters:** Ensures the answer is grounded in the retrieved documents, not hallucinated or off-topic.

---

#### **4. Agreement (5% weight) - Corroboration**

**What it measures:** How many sources have **high confidence** (≥0.6 similarity).

- **Calculation:** (Count of sources with score ≥0.6) ÷ (Total sources)
- **Example:** If 2 out of 3 sources score ≥0.6:
  - Agreement = 2 ÷ 3 = 0.67
  - Contribution = 0.05 × 0.67 = **0.03**

**Why it matters:** Multiple strong sources = higher agreement = slightly higher confidence.

---

## Example: Why a Correct Answer Shows 50% Confidence

### **Scenario**

You ask: "What is the university location?"

✅ **The answer is correct:** "UIT is in Uvarsad, 10 km from Gandhinagar"

⚠️ **But confidence shows 50%**

### **The Calculation Behind It**

| Factor         | Score | Weight   | Contribution            |
| -------------- | ----- | -------- | ----------------------- |
| Top Confidence | 0.60  | 55%      | 0.33                    |
| Avg Confidence | 0.50  | 25%      | 0.125                   |
| Coverage       | 0.60  | 15%      | 0.09                    |
| Agreement      | 0.67  | 5%       | 0.03                    |
| **TOTAL**      | —     | **100%** | **0.575 → 57.5% ≈ 50%** |

### **Why Each Factor Was Low**

1. **Top Confidence (0.60):** The vector embedding model found the location info only 60% similar to your question phrasing
2. **Avg Confidence (0.50):** The other 2 retrieved sources weren't as relevant to location
3. **Coverage (0.60):** Your answer used some words the documents didn't use (e.g., "location" vs "located")
4. **Agreement (0.67):** Only 2 out of 3 sources strongly supported this

### **Key Insight**

The answer is **100% correct**, but the **evidence quality is 57%** → System is conservative and honest about its confidence in the sources.

---

## Why Always 3 Sources?

### **Hardcoded in Backend**

The system retrieves exactly **3 documents** for every query:

```python
# backend/rag_engine.py, lines 657 & 684
relevant_docs = self.search(translated_query, n_results=3)
```

### **Why 3?**

| Aspect                     | Explanation                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| **Balance**                | Enough diversity to check agreement, but not too many to dilute focus |
| **Speed**                  | Only 3 vector searches per query = fast response time                 |
| **Confidence calculation** | Agreement factor works best with 3-5 samples                          |
| **Context window**         | 3 sources fit comfortably in Groq LLM's context                       |
| **Coverage**               | Usually sufficient for most university-related questions              |

### **Process**

```
1. User asks question
   ↓
2. Translate to English (if needed)
   ↓
3. Convert to 768-D embedding (all-mpnet-base-v2 model)
   ↓
4. Search Qdrant for top 3 matching documents (by cosine similarity)
   ↓
5. Calculate confidence using 4-factor formula on those 3 sources
   ↓
6. Generate answer using those 3 + conversation history
   ↓
7. Return answer + confidence + evidence snippets
```

---

## When Confidence Is High (80%+)

**Multiple strong sources align:**

| Condition             | Example                                       |
| --------------------- | --------------------------------------------- |
| Top confidence ≥ 0.80 | Best document scores 0.80+                    |
| Avg ≥ 0.75            | All 3 sources are relevant (0.85, 0.75, 0.70) |
| Coverage ≥ 0.80       | Answer words closely match source wording     |
| Agreement = 1.0       | All 3 sources score ≥0.6                      |

**Real example:**

- Faculty questions often score 85%+ because multiple faculty documents contain exact names and specializations
- Generic institutional questions score 70-80% because info appears in multiple places

---

## When Confidence Is Low (20-40%)

**Poor source alignment:**

| Condition             | Example                                   |
| --------------------- | ----------------------------------------- |
| Top confidence < 0.50 | Question poorly matched to documents      |
| Avg < 0.40            | Most sources are irrelevant               |
| Coverage < 0.30       | Answer uses terminology not in sources    |
| Agreement < 0.33      | Fewer than 1-2 sources support the answer |

**Real example:**

- Questions about internship companies (not documented) score <30%
- Specific cutoff scores (not provided) score <20%

---

## Design Philosophy

### **Why Conservative Scoring?**

The system prioritizes **honest uncertainty** over inflated confidence:

✅ **Advantages**

- Users know when to trust the system vs. ask for clarification
- Lower confidence = "take this with a grain of salt"
- Prevents over-reliance on weak evidence

❌ **Trade-off**

- Correct answers sometimes show lower confidence than deserved
- May feel pessimistic about system reliability

### **Coverage Term Purpose**

The coverage factor (15%) ensures answers don't summarize your opinion—they must be **grounded in retrieved documents**. This prevents:

```
Query: "Why is AI important?"
❌ Bad (no coverage): "AI is transformative because..."
✅ Good (high coverage): "According to our documents, AI careers in..."
```

---

## Improving Confidence Scores

### **For End Users (Query Phrasing)**

| Strategy                              | Example                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| **Use exact terms from documents**    | ❌ "Campus location" → ✅ "Where is UIT located?"                               |
| **Ask specific, not vague questions** | ❌ "Tell me about the college" → ✅ "What engineering programs does UIT offer?" |
| **Include relevant keywords**         | ❌ "Faculty?" → ✅ "Which faculty teach Cloud Computing?"                       |

### **For Developers (System Level)**

| Improvement                                     | Impact                           | Difficulty |
| ----------------------------------------------- | -------------------------------- | ---------- |
| **Increase top_n sources** (3→5)                | Higher coverage, lower speed     | Easy       |
| **Improve documents** (add more detail)         | Higher coverage & top_confidence | Medium     |
| **Better embeddings model** (upgrade all-mpnet) | Higher vector similarity         | Hard       |
| **Reduce top_n to 1-2**                         | Faster, but lower agreement      | Easy       |

---

## Evidence Display

When you see the answer, the system shows:

```
ANSWER CONFIDENCE: 50%

─ Source #1: 61.5% match
  "UIT is located 10 km from Gandhinagar in Uvarsad..."

─ Source #2: 48.6% match
  "The hostel buildings provide campus access..."

─ Source #3: 48.5% match
  "Campus facilities include classrooms, labs..."

[View Evidence] button reveals detailed breakdown
```

### **What Each Mean**

| Label                 | Meaning                                              |
| --------------------- | ---------------------------------------------------- |
| **ANSWER CONFIDENCE** | Overall trust in the answer (using 4-factor formula) |
| **#1, #2, #3 scores** | Raw similarity of each individual source (0-100)     |
| **Snippet**           | First 280 characters of the document                 |
| **Metadata**          | Category, program, or other tags                     |

---

## FAQ

### **Q: Why is my answer correct but confidence low?**

**A:** Confidence measures **evidence quality**, not answer correctness. The system might have:

- Found relevant documents but with lower similarity scores
- Generated an answer using different wording than the sources
- Retrieved mostly irrelevant documents in the top 3

### **Q: Can I change the 3 sources limit?**

**A:** Yes! Modify [backend/rag_engine.py](backend/rag_engine.py#L657):

```python
# Change from:
relevant_docs = self.search(translated_query, n_results=3)

# To (for more sources):
relevant_docs = self.search(translated_query, n_results=5)
```

**Trade-offs:**

- **5 sources:** Higher confidence, slightly slower, more context
- **1-2 sources:** Faster, lower confidence, more focused

### **Q: Does higher confidence always mean correct?**

**A:** Not necessarily. If documents are wrong, high confidence is a false positive. The system is only as good as its training data.

---

## Implementation Details

**File locations:**

- **Confidence calculation:** [backend/main.py](backend/main.py#L345) - `_compute_trust_and_evidence()`
- **Search logic:** [backend/rag_engine.py](backend/rag_engine.py#L212) - `search()` method
- **Query processing:** [backend/rag_engine.py](backend/rag_engine.py#L657) - `query()` & `stream_query()`

**Key constants:**

- **Weights:** 55% top, 25% avg, 15% coverage, 5% agreement
- **Agreement threshold:** 0.6 (sources scoring ≥0.6 count towards agreement)
- **Coverage calculation:** Token overlap using regex tokenization
- **Default n_results:** 3

---

## Summary

| Aspect                          | Details                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------- |
| **What it is**                  | A 4-factor formula measuring evidence quality                                   |
| **Range**                       | 0-100% (0.0-1.0 internally)                                                     |
| **Factors**                     | Top doc match (55%), avg match (25%), word overlap (15%), corroboration (5%)    |
| **Why 50% for correct answers** | Source similarity/relevance is low even if answer is right                      |
| **Why 3 sources**               | Balance between confidence, speed, and diversity                                |
| **When to trust it**            | High confidence (70%+) = Sources are strong; Low (30%-) = Ask for clarification |

---

**Last Updated:** March 26, 2026  
**For questions:** See backend/main.py and backend/rag_engine.py implementation
