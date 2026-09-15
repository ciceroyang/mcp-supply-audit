# The business shape: enterprise agent governance

*Written after the monetisation question was settled: business customers, the shape of OpenViking.*

That single constraint resolves most of the earlier wandering. A consumer product has
to find someone to pay for a problem the sufferer will not pay for. A business has a
budget line already: risk. Nobody buys convenience in security; they buy the ability to
answer a question from their own auditor.

## Who buys, and what they are being asked

The buyer is a platform or security engineering team at a company that has started
letting agents act — coding agents in CI, assistants over internal data, an MCP tool
registry of their own. What they are being asked, usually right after something goes
wrong, is:

- which tools and servers can our agents actually reach, and where did they come from?
- which of those run code at install time, take a filesystem root, or hold a credential?
- who approved that, and what evidence do we have that it was checked?

Today the answer is a spreadsheet, if there is one at all. That is the gap, and it is a
gap a vendor cannot close for them: the inventory spans the registry, the package
registries, every repository, and whatever the agents load at runtime.

## The product in four parts

1. **Inventory.** Continuously collect what exists: registry entries, published package
   manifests, repository contents, and the configuration agents actually load.
2. **Evidence.** State what each artefact is, with the bytes behind the claim. Nothing
   measured is `unmeasured`, and an artefact with an unmeasured part is never `clean`.
3. **Policy.** Express what the company allows — versions pinned, no fetch-and-execute
   at install, provenance required, filesystem roots refused — and evaluate it against
   the evidence.
4. **Enforcement.** Fail a pull request at CI time, and route runtime tool calls through
   a gateway so the same policy applies to what already shipped.

Plus the thing that makes it sellable rather than merely true: **an audit trail**. Every
decision links to the bytes it was made from, so a security review can be answered with
a report instead of an afternoon.

## Open core

| open source (AGPL-3.0) | commercial licence |
| --- | --- |
| collection pipelines, index, evidence model | SSO, RBAC, multi-tenant |
| policy engine and rules | long-term audit retention and export |
| scanner and CLI | SIEM and ticketing integrations |
| local gateway | managed or self-hosted enterprise deployment, SLA, support |

The split is deliberate: the part that makes the evidence trustworthy must stay
inspectable by the people relying on it. What is sold is the part a company needs
before it can put that evidence in front of an auditor.

## Why the position is defensible

The same three conditions from `crosscheck/docs/why-this-lasts.md`: adversarial,
cross-boundary, misaligned. A control plane for agent tools is all three. A model vendor
can ship a scanner, but they cannot credibly attest to the tools their own platform
ships, and they do not see the company's repositories or runtime.

The accumulating asset is not the rules — rules are copyable. It is the evidence corpus,
the policy history, and the audit trail inside each customer. Those compound and do not
transfer to a competitor.

## What already exists

| piece | state |
| --- | --- |
| registry census with per-finding provenance | running daily, published |
| package manifest checks | joined into the index |
| repository scanning | 150 repositories per run, hand-verified findings |
| the evidence model and derived verdict | implemented, 2142 records |
| the scanner and its invariant | separate repository, CI enforced |
| rule-set measurement | so the rules themselves are auditable |

That is a credible open-source core in pieces. It is not yet one product, and the pieces
are still separate repositories with separate identities.

## What is missing, honestly

- **One thing, not four.** A buyer will not assemble census + scanner + index + checker.
   Consolidating into one project with one name, one quickstart and one deployment is
   the next structural work.
- **Runtime.** The gateway is the part that touches production, and it does not exist.
- **Enterprise surface.** SSO, RBAC, retention, export, deployment charts.
- **Design partners.** The hardest and least technical item. Two or three companies that
   will run this on real repositories are worth more than any feature on this list, and
   they cannot be manufactured from a terminal.

## Licence

AGPL-3.0, matching the shape of the projects this is modelled on. A commercial licence is
available for use the AGPL does not permit, which is the standard dual-licence arrangement
for infrastructure: the core stays inspectable, and companies that need it under different
terms can buy those terms.
