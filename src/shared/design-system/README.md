# Design System — where things are

A map, not a contract. It states no rules; it names the authoritative source for each
question so you can get to it from inside the code.

The repository is the source of truth for structure — there is no file tree here,
because one would go stale the first time something moved.

## Where do I find…

| Question | Authoritative source |
|---|---|
| What does this token mean? Which tier do I bind, and when? | [Foundation contract](../../../docs/frontend/design-system/foundation.md) |
| When does a value stay local, and when does it become shared? | [Foundation contract](../../../docs/frontend/design-system/foundation.md) |
| Why does this rule exist? What was considered and rejected? | the [ADR](../../../docs/architecture/decisions/) the rule cites |
| How do I build a component in this layer? | [Component-authoring contract](../../../docs/frontend/design-system/components.md) |
| What does the Design System own, and what does it refuse? | [Design System README](../../../docs/frontend/design-system/README.md) |
| How do I use a particular component? | that component's own README, where one is earned |
| How does a feature or page compose the system? | documentation beside the module that owns it |
| What does a component look like, and how does it behave? | Storybook — `npm run storybook` |
| What props does it take? What variants exist? | its TypeScript types |
| What is enforced automatically? | the `*.test.ts` checks in this layer |
| Is a known problem already recorded? | the [findings register](../../../docs/architecture/findings/) |
