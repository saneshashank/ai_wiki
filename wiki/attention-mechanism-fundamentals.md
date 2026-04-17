# Attention Mechanism Fundamentals

## Summary
Attention solves the context problem in language models by allowing tokens to dynamically gather information from surrounding context. This article builds self-attention from first principles, progressing from the limitations of static embeddings through dot-product similarity, learnable Q/K/V projections, and softmax normalization.

## Key Points
- Static word embeddings cannot capture context-dependent meaning (e.g., "bank" as river vs. financial institution)
- Similarity-based weighting using dot products enables context-aware representations
- Query (Q), Key (K), and Value (V) projections decouple three distinct roles: searching for relevance, advertising availability, and extracting useful content
- Softmax converts raw attention scores into normalized probability distributions
- Self-attention is symmetric—every token simultaneously queries and provides context to all others

## Details

### The Context Problem
Static embeddings fail because a single vector cannot simultaneously represent all meanings of a polysemous word. Word meaning is fundamentally contextual: "apple" near "iPhone" differs from "apple" near "pie." We need a mechanism to dynamically adjust a token's representation based on its neighbors.

### From Fixed to Dynamic Weights
The naive approach uses weighted combinations: X'₁ = a₁X₁ + a₂X₂ + a₃X₃ + a₄X₄. However, fixed weights cannot adapt to different contexts. The key insight is computing weights dynamically using dot-product similarity: aᵢ = X₁ · Xᵢ. High dot products indicate semantic alignment and relevance, automatically producing context-sensitive weights.

### Query-Key-Value Decomposition
Raw dot products measure similarity in the original embedding space, which may not align with the task-specific notion of "relevance" needed for attention. The solution introduces three learnable projections:

- **Query (Q)**: WQ X — represents what a token is looking for (information needs)
- **Key (K)**: WK X — represents what a token offers (relevant features)
- **Value (V)**: WV X — represents the actual content to mix (semantic contribution)

This separation allows the model to learn different similarity metrics for matching vs. extracting content—analogous to matching books by title/tags (K) while retrieving their full content (V).

### Self-Attention Formula
For each token i:

1. Compute query: Qᵢ = WQ Xᵢ
2. Compute keys: Kⱼ = WK Xⱼ (for all j)
3. Compute values: Vⱼ = WV Xⱼ (for all j)
4. Score matches: scoreᵢ,ⱼ = Qᵢ · Kⱼ
5. Normalize: wᵢ,ⱼ = softmax(scoreᵢ,ⱼ)
6. Mix: X'ᵢ = Σⱼ wᵢ,ⱼ Vⱼ

### Why Softmax
Softmax converts unbounded dot products into a probability distribution (0 to 1, summing to 1). It emphasizes high-scoring matches and suppresses low-scoring ones, enabling stable gradient flow during training.

## Source
- [Attention from First Principles - 1 - by shashank sane](https://latticeofdeeplearning.substack.com/p/attention-from-first-principles-1)

## Related
(No existing related articles in wiki index)

---
*Added: 2026-04-17*