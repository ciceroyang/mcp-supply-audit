# Why the product is the tool supply, not the audit

*Positioning note. Written after the first thesis was challenged.*

## Two tiers of need

Reproducible evidence is a vitamin. It is correct, it is defensible, and nobody goes looking for it on a Tuesday. A developer reaches for it when something has already gone wrong, or when compliance asks. The customer is reactive, which means the product has to create the worry before it can sell the remedy.

Context is a painkiller. An agent without memory is not a slightly worse agent, it is a useless one. The need is felt in every session, by everyone building one, without anybody having to explain why it matters. That is the difference that shows up as stars.

The first thesis for this repository — a trust index for agent tools — was the vitamin tier. It is good work and it is still the right thing to compute. It is not the product.

## The position

Directly competing on memory and context retrieval is not winnable from here. That space has teams, vector infrastructure and published benchmarks, and entering it now means competing on capital and scale.

The first-order need that is still open is one step to the side: **how an agent gets the tools it runs, and what it knows about them.** Today that step is pasting a command into a config file. The version is unpinned, the install hooks are unread, the permissions are unbounded, and the provenance of the package is a guess.

So the product is the supply step, and the evidence is what it runs on:

- one command adds a tool, and it resolves the version, writes the configuration, and prints what it is about to trust
- every claim it shows comes from the index, and links to the bytes it came from
- anything unmeasured is labelled unmeasured, so the tool never says a server is fine when nobody checked

Reproducibility stops being the product and becomes the reason to believe the product. That is the right place for it.

## What this changes in the repository

- The index stops being the deliverable and becomes an input.
- The scanner becomes the policy layer the installer consults before it writes a config.
- The unit of work is a command a developer runs when adding a tool, not a report they read once.
