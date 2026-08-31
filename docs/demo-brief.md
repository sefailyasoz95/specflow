# The brief to paste in the demo

Deliberately messy — the way a client actually talks. It has an implied
sequence, two constraints, and one thing that is out of scope, so the agent has
something real to decide about.

---

We're rebuilding checkout for our marketplace. Right now people drop off hard
at the payment step — something like 40% — and support keeps getting the same
two emails: "why was I charged twice" and "where do I put the discount code".

What we need: a single-page checkout instead of the current three steps. Guest
checkout, because forcing signup is half the problem. Saved cards for people
who do have accounts. Apple Pay and Google Pay. A promo code field that
actually validates before you hit pay. And idempotency on the payment call so a
double-click stops creating two orders.

Constraints: we're on Stripe already and not moving. Two engineers. I want
something shippable in six weeks, and the payment idempotency fix has to go out
first because it's costing us refunds every week.

Not doing: subscriptions, multi-currency, or the fraud rules rework. Those are
next quarter.

---

## What to ask the agent

> Read this project, then propose a plan from that brief. Estimate everything.

Then, after approving:

> The idempotency work has to ship first — move it into sprint 1 and show me
> what that does to the sprint.

And to show a rejection:

> Actually sprint 3 is too heavy for two people. Re-cut it.
