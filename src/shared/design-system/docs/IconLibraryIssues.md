# Icon Library — GitHub Issues

---

## Parent Issue

### Title: Design System Icon Library — Centralized SVG icon components

Create a centralized icon library for the design system. Each icon is a React
component with a shared IconProps interface (size, color, className).
Icons use currentColor by default, are aria-hidden for accessibility,
and are tree-shakeable via barrel exports.

**Steps:**
1. Define shared IconProps interface (size, color, className, strokeWidth)
2. Create starter icons: Upload, Trash, X, Check, Eye, EyeOff, Search, ChevronDown, User, Camera
3. Create barrel export (index.ts)
4. Add Storybook stories for visual catalog
5. Add documentation (Icons.md)
