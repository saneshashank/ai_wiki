# Scaling Laws for LLMs: From GPT-3 to o3

## Summary
Scaling laws describe the predictable relationship between LLM performance (test loss) and scale factors like model size, training data, and compute. Understanding these power-law relationships has been central to AI progress, from GPT-3 through modern models, though recent claims of scaling plateaus raise questions about the future of pure scaling-based advancement.

## Key Points
- **Power laws** fundamentally describe how LLM performance improves with increased parameters, data, and compute—typically expressed as inverse relationships (improvement becomes exponentially harder at larger scales)
- **Seminal research** (Kaplan et al., 2020) demonstrated smooth scaling trends spanning 6–8 orders of magnitude, showing scale is the dominant factor over architecture choices
- **Larger models are more sample-efficient**: optimal compute-allocation involves training very large models on proportionally less data, stopping before convergence
- **Practical application**: scaling laws allow researchers to forecast large model performance from smaller experiments, reducing risk in expensive training runs
- **GPT lineage** (GPT through GPT-4) exemplified scaling-driven progress, though later models increasingly leveraged post-training improvements alongside scale
- **Recent concerns**: reports of scaling plateaus and diminishing returns challenge the long-standing "North Star" of scaling-focused AI research

## Details

### Fundamental Concepts
Power laws express relationships as `y = a * x^(-p)`, where negative exponents create the characteristic inverse relationship seen in LLM scaling plots. When plotted on log-log scales, these inverse power laws appear linear—the signature pattern of LLM scaling research.

### Scaling Dimensions
Research identified three primary scaling factors:
1. **Model size** (parameters)
2. **Dataset size** (tokens)
3. **Training compute** (FLOPs)

Each exhibits a power-law relationship with test loss when the others are not bottlenecked. Optimal scaling requires increasing all three in concert; scaling one in isolation yields diminishing returns.

### Key Finding: Sample Efficiency
Larger models reach target loss levels with fewer training examples than smaller models. This counterintuitive result suggests theoretical optimality differs from practical deployment—we often train smaller models longer due to inference cost constraints.

### Historical Progression
**GPT (117M params)** established decoder-only transformer pretraining as effective. **GPT-2** scaled this approach, and **GPT-3** demonstrated remarkable few-shot capabilities through massive scale (175B params). Later models (GPT-4, o3) increasingly combined scaling with sophisticated post-training techniques rather than pure pretraining scale.

### The Plateau Question
While scaling laws have reliably predicted progress for years, emerging reports suggest challenges in scaling's continued effectiveness. The article frames this as a critical juncture for AI research methodology.

## Source
- [Scaling Laws for LLMs: From GPT-3 to o3](https://cameronrwolfe.substack.com/p/llm-scaling-laws) — Cameron R. Wolfe, Ph.D., January 6, 2025

## Related
(No related pages in current index)

---
*Added: 2026-04-17*