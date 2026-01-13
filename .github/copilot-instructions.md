# Copilot Instructions for Shajarat Al-Aeila

## Architecture Overview
Arabic family tree app with **dual backend**: Firebase Auth (phone OTP) + Supabase (PostgreSQL data).

### Data Flow
1. **Auth**: `AuthContext.jsx` wraps app → Firebase phone auth → stores user state
2. **Tribe**: `TribeContext.jsx` → auto-joins user to default tribe via `tribeService.js`
3. **Tree**: `FamilyTreeAdvanced.jsx` fetches via `getTribeTree()` → `FamilyTreeBuilder.js` builds hierarchy → D3.js renders

### Key Service Boundaries
- `src/firebase/auth.js` - OTP send/verify with reCAPTCHA (Iraqi numbers must start with `+964`)
- `src/services/tribeService.js` - All Supabase queries (persons, relations, tribes); includes `wouldCreateCircle()` to prevent cyclic relations
- `src/supabaseClient.js` - Single Supabase client instance

## Developer Commands
```bash
npm run dev          # Vite dev server at localhost:5173
npm run build        # Production build
npm run lint:fix     # ESLint auto-fix
npm run deploy       # Firebase hosting deploy
npm run fresh-install # Clean reinstall (fixes dependency issues)
```

## Critical Patterns

### Context Usage (Required Order)
```jsx
// App.jsx wraps in this order - don't change
<AuthProvider>      {/* Must be outermost */}
  <TribeProvider>   {/* Depends on AuthContext */}
    <AppRoutes />
  </TribeProvider>
</AuthProvider>
```

### Adding Family Members
Relations stored in `relations` table with `parent_id`/`child_id`. Always check for cycles:
```js
// tribeService.js pattern - never skip cycle check
if (await wouldCreateCircle(tribeId, parentId, childId)) {
  throw new Error('This would create a circular relationship');
}
```

### RTL & Arabic UI
- All text defaults to Arabic; use `direction: 'rtl'` in styles
- MUI theme in `App.jsx` sets `direction: 'rtl'` globally
- Font: Cairo (loaded in theme)

### Debug Logging
```js
import debugLogger from './utils/DebugLogger.js';
debugLogger.familyDebug('🔍', 'message', optionalData);
// Enable in browser: window.familyDebug.enable()
```

## File Patterns
| Task | Files to Modify |
|------|----------------|
| New page | `src/pages/NewPage.jsx` + route in `AppRoutes.jsx` |
| Tree feature | `FamilyTreeAdvanced.jsx` (UI) + `FamilyTreeBuilder.js` (logic) |
| Database query | `tribeService.js` only |
| Analytics | `FamilyAnalytics.js` (auto-calculates generations from `parentId`) |

## Environment Variables (.env)
```env
# Firebase (Auth only)
VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID
# Supabase (Data)
VITE_SUPABASE_URL, VITE_SUPABASE_KEY
```

## Database Schema Notes
- Schema files: `supabase-schema.sql`, `supabase-tribe-schema.sql`
- Key tables: `tribes`, `persons`, `relations`, `tribe_users`
- Relations use `parent_id`/`child_id` (not nested objects)

## Don'ts
- Never use `console.log` in production - use `DebugLogger`
- Never bypass `ProtectedRoute.jsx` for authenticated pages
- Never create relations without cycle detection
- Never hardcode phone country code (always expect `+964` prefix)
