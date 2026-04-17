# Applying Statistics to LLM Evaluations

## Summary
Most LLM evaluations naively compare performance metrics without statistical rigor, risking false conclusions from noise. This guide builds a statistical foundation for model evaluations, covering core concepts like confidence intervals, standard error, and the Central Limit Theorem, then applies them to properly interpret LLM evaluation results with uncertainty quantification.

## Key Points
- Raw performance comparisons without statistical significance testing lead to spurious results
- Standard error, confidence intervals, and the CLT enable uncertainty-aware evaluation interpretation
- The law of total variance decomposes evaluation variability into question-sampling and within-question (stochastic) components
- Evaluation datasets are finite samples from a theoretical super-population of all possible questions
- Binary (Bernoulli) evaluation scores have simplified standard error expressions

## Details

### Foundational Statistical Concepts

**Random Variables and Estimators**
- A random variable X has a mean (expectation) and variance describing its spread
- The sample mean estimates the true mean; with n samples, variance of the sample mean is σ²/n
- Covariance measures how two variables vary together; useful for separating sources of randomness
- The law of total variance decomposes variance: Var(X) = E[Var(X|Y)] + Var(E[X|Y])

**Standard Error and Sampling Distributions**
- Standard error is the standard deviation of sample means (not individual observations)
- Formula: SE = σ / √n (assuming IID samples)
- For binary scores: SE = √(μ(1-μ) / n) where μ is the sample mean
- Smaller standard error means more reliable mean estimates

**Law of Large Numbers & Central Limit Theorem**
- Law of Large Numbers: sample mean converges to true mean μ as n → ∞
- Central Limit Theorem: sample means follow approximately normal distribution N(μ, σ²/n) for large n
- CLT enables statistical inference even when underlying data isn't normally distributed

### Confidence Intervals

A 95% confidence interval around sample mean x̄ₙ is: **x̄ₙ ± 1.96 × SE(x̄ₙ)**

This means if you repeated sampling many times, 95% of computed intervals would contain the true mean. The interval width depends on:
- Sample size n (larger n → narrower interval)
- Data variability σ (higher variance → wider interval)

### Statistical Framing for LLM Evaluations

**Super-Population Model**
- Theoretical super-population: all possible questions that could evaluate an LLM
- Actual evaluation dataset: finite sample from this super-population
- Evaluation results reflect both true model differences and sampling/stochastic noise

**Sources of Variance in Evaluations**
1. **Question sampling variance**: Which questions are selected affects scores
2. **Within-question variance**: Stochastic LLM generation and judge decisions introduce variability

The law of total variance separates these components, critical for proper interpretation.

**Best Practices**
- Report confidence intervals, not just point estimates
- Test statistical significance before claiming improvements
- Account for finite sample effects in evaluation datasets
- Recognize that higher performance numbers don't guarantee real progress if not statistically significant

## Source
- [Applying Statistics to LLM Evaluations](https://cameronrwolfe.substack.com/p/stats-llm-evals)

## Related
- [Scaling Laws for LLMs: From GPT-3 to o3](llm-scaling-laws.md)

---
*Added: 2026-04-17*