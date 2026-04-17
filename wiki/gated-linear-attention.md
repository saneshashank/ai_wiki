# Gated Linear Attention (GLA)

## Summary
Gated Linear Attention solves the accumulation problem in linear attention by introducing learned forget and input gates that control what information persists in the state matrix. This enables the model to selectively forget stale context while reinforcing relevant information, all while maintaining parallelizability through prefix scans.

## Key Points
- **The Accumulation Problem**: Plain linear attention accumulates every token's key-value association into a state matrix S with no mechanism for forgetting, causing long sequences to become contaminated with irrelevant old context
- **Two Gates, Two Decisions**: GLA adds per-dimension forget gate α (how much old memory to preserve) and input gate β (how strongly to write new information), replacing blind accumulation with selective updates
- **Gated Recurrence**: The update rule S_t = α_t ⊙ S_{t-1} + β_t · (v_t ⊗ k_t) gives each dimension independent control over forgetting and writing
- **Parallel Prefix Scan**: Despite gates creating sequential dependencies, the linear structure of the recurrence enables parallelization via associative combining of steps into a tree, reducing O(N) sequential steps to O(log N) parallel levels
- **Chunking Strategy**: Production implementations split sequences into 64-token chunks, using parallel computation within chunks and sequential state passing between them for optimal GPU memory usage

## Details

### From RNNs Back to Gating
GLA revisits a problem solved by LSTMs and GRUs in the 1990s: how does a fixed-size hidden state process arbitrarily long sequences without drowning in accumulated information? Transformers sidestepped this with full attention, but the quest for efficiency on long sequences brings the problem—and its solution—back. The difference: GLA's gates are designed for parallel hardware from the start, unlike LSTM's sequential dependencies.

### The Gated Update Rule
Each token produces α and β via learned sigmoid projections:
```
α_t = sigmoid(W_α · x_t)    (forget gate: 0-1 per dimension)
β_t = sigmoid(W_β · x_t)    (input gate: 0-1 per dimension)
S_t = α_t ⊙ S_{t-1} + β_t · (v_t ⊗ k_t)
```

The ⊙ is element-wise multiplication, making both gates act independently per dimension. A dimension tracking topic can be heavily gated (α ≈ 0) while a dimension tracking style preserves more (α ≈ 0.9).

### Worked Example
Starting with topic-heavy state S = [[80, 50], [60, 40]] and a new weather token:
- α = [0.1, 0.9]: "forget topic, keep style"
- β = [0.8, 0.3]: "write topic strongly, style weakly"
- Result: S_new = [[16, 5], [60, 36]] — topic dimension nearly cleared and rewritten, style dimension preserved

### Parallelizing via Prefix Scan
The key insight: the gated recurrence is linear. Two sequential steps can be composed into one equivalent step:
```
S_t = α_t · S_{t-1} + b_t
S_{t+1} = α_{t+1} · S_t + b_{t+1}

Combines to: S_{t+1} = (α_{t+1} · α_t) · S_{t-1} + (α_{t+1} · b_t + b_{t+1})
```

This composition is associative, enabling a binary tree structure: N sequential steps become log₂(N) parallel levels. For 100,000 tokens, this is 17 GPU steps instead of 100,000 sequential ones.

### Implementation Strategy
Recurrent mode is correct but slow (Python loop). Production uses:
1. **Parallel within chunks** (64 tokens): Full parallel scan in fast GPU SRAM
2. **Sequential between chunks**: Pass final D×D state forward as initialization
3. **Fused kernels**: Flash Linear Attention library provides optimized Triton kernels

This balances parallelism within chunks (speed) and minimal memory carrying between chunks (efficiency).

## Source
- [Attention from First Principles - 5 - by shashank sane](https://latticeofdeeplearning.substack.com/p/attention-from-first-principles-5)

## Related
- [Attention Mechanism Fundamentals](attention-mechanism-fundamentals.md)
- [Rotary Position Embeddings (RoPE)](rotary-position-embeddings-rope.md)

---
*Added: 2026-04-17*