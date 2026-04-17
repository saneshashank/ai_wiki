# Rotary Position Embeddings (RoPE): Encoding Order Through Rotation

## Summary
Rotary Position Embeddings (RoPE) solve the fundamental problem that transformers lack inherent sequence understanding by encoding position information through geometric rotation in high-dimensional space. Rather than adding position vectors or memorizing fixed position slots, RoPE rotates embedding pairs at different frequencies, creating multi-scale position awareness that generalizes beyond training lengths.

## Key Points
- Transformers process tokens independently and need explicit positional information to distinguish "cat sat" from "sat cat"
- Good position encodings must capture relative distances, handle multiple scales simultaneously, and generalize beyond training sequence lengths
- RoPE encodes position by rotating pairs of embedding dimensions—rotation requires 2D space, so 64-dimensional embeddings are split into 32 independent 2D planes
- Each dimension pair rotates at a different frequency determined by `freq_i = 1 / (theta^(2i/head_dim))`, where theta typically equals 10,000–1,000,000
- High-frequency pairs (low indices) capture short-range patterns; low-frequency pairs (high indices) track long-range dependencies
- Position determines rotation angle: `angle = position × frequency`, creating a clean separation between token content and positional context

## Details

### Why Rotation?
Addition—the traditional approach—blends position and content inseparably. Rotation preserves magnitude while changing only direction, cleanly separating positional encoding from token semantics. Crucially, you cannot rotate a 1D number while preserving magnitude; rotation requires at least two dimensions.

### From 1D to 2D Pairs
A 4-dimensional embedding `[5, 3, 2, 7]` is split into two pairs: `(5, 3)` and `(2, 7)`. Each pair forms a point on its own 2D plane and rotates independently based on position. The same token "cat" gets different rotated embeddings at different positions, baking positional information directly into the representation.

### The Frequency Spectrum
RoPE applies different rotation frequencies to each pair—analogous to clock hands moving at different speeds. Fast-rotating pairs (high frequency) distinguish nearby positions within 2–5 tokens. Slow-rotating pairs (low frequency) barely rotate across 100-token distances, treating them as relatively close in long documents. This multi-scale spectrum emerges from a geometric progression of frequencies across embedding dimensions.

### Mathematical Foundation
For pair `(x, y)` at position `pos` with frequency `freq`, the 2D rotation formula is:
```
x_new = x·cos(pos·freq) - y·sin(pos·freq)
y_new = x·sin(pos·freq) + y·cos(pos·freq)
```

This preserves distance from origin (magnitude) while rotating the angle based on position.

### Theta and Sequence Length
The base frequency `theta` (typically 10,000–1,000,000) determines rotation speed. Larger theta values suit longer sequences: LLaMA uses 10,000 for 2K–4K tokens, while CodeLLaMA uses 1,000,000 for 16K tokens. The value is empirically tuned, not theoretically derived.

### Implementation Strategy
1. Compute frequencies for each dimension pair
2. Calculate rotation angles as outer product of positions and frequencies
3. Precompute sin/cos of all angles
4. Split embeddings into even/odd dimension pairs
5. Apply 2D rotation matrix to each pair
6. Interleave rotated pairs back into original dimension order

## Source
- [Understanding (RoPE) Rotary Position Embeddings - 1](https://latticeofdeeplearning.substack.com/p/understanding-rope-rotary-position)

## Related
- [Attention Mechanism Fundamentals](attention-mechanism-fundamentals.md)

---
*Added: 2026-04-17*