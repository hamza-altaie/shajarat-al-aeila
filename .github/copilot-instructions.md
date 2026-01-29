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
| Auth State | `src/AuthContext.jsx` | Firebase `onAuthChange` listener, `useAuth()` hook |
| Tribe State | `src/contexts/TribeContext.jsx` | Auto-join tribe, membership checks, `useTribe()` hook |
| Data | `src/services/tribeService.js` | **ALL** Supabase queries - centralized data layer |
| Tree Logic | `src/utils/FamilyTreeBuilder.js` | Hierarchy building, `isChildOfParent()`, `findFamilyHead()` |
| Tree UI | `src/components/FamilyTreeAdvanced.jsx` | D3.js rendering, export, search |
| Relations | `src/utils/FamilyRelations.js` | `MALE_RELATIONS`, `FEMALE_RELATIONS` arrays, `RelationUtils` |

## Commands
```bash
npm run dev           # localhost:5173
npm run build         # Production build (Vite)
npm run lint:fix      # ESLint auto-fix
npm run deploy        # Firebase hosting deployment
npm run fresh-install # Clean reinstall (deletes node_modules + lock)
npm run preview       # Preview production build locally
```

## Critical Patterns

### Context Provider Order (App.jsx)
```jsx
<AuthProvider>      {/* Outermost - Firebase auth state */}
  <TribeProvider>   {/* Depends on useAuth() - auto-joins tribe on login */}
    <AppRoutes />
  </TribeProvider>
</AuthProvider>
```
**Why this order matters**: `TribeProvider` calls `useAuth()` to get `user.uid` for tribe membership.

### Relation Cycle Prevention (CRITICAL)
```js
// tribeService.js - ALWAYS check before creating relations
if (await wouldCreateCircle(tribeId, parentId, childId)) {
  throw new Error('This would create a circular relationship');
}
// Uses DFS graph traversal to detect A→B→C→A cycles
// Fail-safe: returns true on error to prevent relation creation
```

### Smart Auto-Linking (tribeService.js)
When adding a person, `smartAutoLink()` automatically creates relations:
1. Links new person to potential parent via `fatherName` matching
2. Links existing children whose `fatherName` matches new person's `firstName`
3. Links siblings with same `fatherName` and `grandfatherName`

Uses `namesAreSimilar(name1, name2, threshold=0.85)` with Arabic normalization:
```js
// normalizeNameForMatch(): أ/إ/آ→ا, ة→ه, ى→ي, lowercase
```

### RTL & Arabic UI
- MUI theme: `direction: 'rtl'` set dynamically in `createDynamicTheme()` (App.jsx)
- Font: `Cairo` (Google Fonts) configured in theme typography
- All UI text in Arabic - use Arabic strings for labels/messages

### Routing & Protection
```jsx
// AppRoutes.jsx - Protected pages use lazy loading
const Family = lazy(() => import('./pages/Family.jsx'));

// Wrap authenticated routes:
<Route path="/family" element={<ProtectedRoute><Family /></ProtectedRoute>} />
```

### Debug Logging (No console.log!)
```js
import debugLogger from './utils/DebugLogger.js';
debugLogger.familyDebug('🔍', 'message', data);  // Conditional logging
debugLogger.error('❌', 'error');                 // Always logs

// Enable in browser console: window.familyDebug.enable()
// Or via URL: ?debug=true
```

## File Modification Guide
| Task | Files to Modify |
|------|-----------------|
| New page | Create `src/pages/X.jsx`, add route in `AppRoutes.jsx`, wrap with `ProtectedRoute` |
| Tree visualization | `FamilyTreeAdvanced.jsx` (D3 rendering) + `FamilyTreeBuilder.js` (data logic) |
| Database CRUD | `tribeService.js` ONLY - never import `supabaseClient` elsewhere |
| Add relation type | Update `MALE_RELATIONS`/`FEMALE_RELATIONS` in `FamilyRelations.js` |
| New tribe feature | `TribeContext.jsx` (state) + `tribeService.js` (queries) |

## Database Schema (Supabase)
- **Tables**: `tribes`, `persons`, `relations` (parent_id/child_id), `tribe_users`
- **Schema files**: `supabase-schema.sql`, `supabase-tribe-schema.sql`
- **RLS policies**: `supabase-rls-policies.sql` - Firebase UID-based access control
- **Key constraint**: `relations` uses `tribe_id + parent_id + child_id` for uniqueness

## Phone Authentication (Firebase)
- Iraqi numbers only: must start with `+964`
- Requires `<div id="recaptcha-container"></div>` in DOM
- `sendOtp()` handles reCAPTCHA lifecycle automatically
- `confirmationResult` stored in module scope for `verifyOtp()`

## Don'ts
- ❌ `console.log` in production → use `DebugLogger`
- ❌ Skip `wouldCreateCircle()` when creating parent-child relations
- ❌ Hardcode phone format → always validate `+964` prefix
- ❌ Bypass `ProtectedRoute.jsx` for authenticated pages
- ❌ Query Supabase outside `tribeService.js` - breaks service boundary
- ❌ Add new relation types without updating both `MALE_RELATIONS` and `FEMALE_RELATIONS`
- ❌ Use `single()` for optional Supabase results → use `maybeSingle()` to avoid 406 errors
