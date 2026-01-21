# Copilot Instructions for Shajarat Al-Aeila

## Architecture Overview
Arabic family tree app with **dual backend**: Firebase Auth (phone OTP) + Supabase (PostgreSQL data).

```
User → PhoneLogin.jsx → Firebase Auth (OTP) → AuthContext.jsx
                                                    ↓
                                           TribeContext.jsx → auto-joins default tribe
                                                    ↓
                                           tribeService.js → Supabase (persons, relations)
                                                    ↓
                                           FamilyTreeBuilder.js → D3.js renders tree
```

### Service Boundaries
| Layer | File | Responsibility |
|-------|------|----------------|
| Auth | `src/firebase/auth.js` | OTP send/verify, reCAPTCHA (Iraqi `+964` only) |
| Data | `src/services/tribeService.js` | ALL Supabase queries, `wouldCreateCircle()` cycle detection |
| Tree Logic | `src/utils/FamilyTreeBuilder.js` | Hierarchy building, name matching (`namesAreSimilar`) |
| Tree UI | `src/components/FamilyTreeAdvanced.jsx` | D3.js rendering, export, search |

## Commands
```bash
npm run dev          # localhost:5173
npm run build        # Production build
npm run lint:fix     # ESLint auto-fix
npm run deploy       # Firebase hosting
npm run fresh-install # Clean reinstall (node_modules + lock file)
```

## Critical Patterns

### Context Provider Order (App.jsx)
```jsx
<AuthProvider>      {/* Outermost - Firebase auth state */}
  <TribeProvider>   {/* Depends on useAuth() */}
    <AppRoutes />
  </TribeProvider>
</AuthProvider>
```

### Relation Cycle Prevention
```js
// tribeService.js - ALWAYS check before creating relations
if (await wouldCreateCircle(tribeId, parentId, childId)) {
  throw new Error('This would create a circular relationship');
}
// Uses graph traversal to detect A→B→C→A cycles
```

### Smart Auto-Linking (tribeService.js)
When adding a person, `smartAutoLink()` automatically:
- Links children to parents via `fatherName` matching
- Uses `namesAreSimilar()` with Arabic normalization (أ/إ/آ→ا, ة→ه, ى→ي)

### RTL & Arabic
- MUI theme: `direction: 'rtl'` set globally in `App.jsx`
- Font: Cairo (configured in theme typography)
- All UI text in Arabic

### Debug Logging
```js
import debugLogger from './utils/DebugLogger.js';
debugLogger.familyDebug('🔍', 'message', data);
// Browser console: window.familyDebug.enable()
```

## File Modification Guide
| Task | Files |
|------|-------|
| New page | `src/pages/X.jsx` + `AppRoutes.jsx` + protect with `ProtectedRoute` |
| Tree visualization | `FamilyTreeAdvanced.jsx` (UI) + `FamilyTreeBuilder.js` (logic) |
| Database queries | `tribeService.js` ONLY |
| Relation types | `FamilyRelations.js` (MALE_RELATIONS, FEMALE_RELATIONS arrays) |

## Database (Supabase)
- Schema: `supabase-schema.sql`, `supabase-tribe-schema.sql`
- Tables: `tribes`, `persons`, `relations` (parent_id/child_id), `tribe_users`
- RLS policies in `supabase-rls-policies.sql`

## Don'ts
- ❌ `console.log` in production → use `DebugLogger`
- ❌ Skip `wouldCreateCircle()` when creating relations
- ❌ Hardcode phone format → always validate `+964` prefix
- ❌ Bypass `ProtectedRoute.jsx` for authenticated pages
- ❌ Query Supabase outside `tribeService.js`
