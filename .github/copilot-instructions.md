# Copilot Instructions for Shajarat Al-Aeila

## Project Overview
- This is a React.js application for managing and visualizing family trees in Arabic.
- The app uses Firebase (Authentication + Firestore) for backend services, Material-UI for UI components, and D3.js for tree visualization.
- Vite is used for fast development and production builds.

## Architecture & Key Components
- Main entry: `src/main.jsx` and `src/App.jsx`.
- Routing: `src/AppRoutes.jsx` defines navigation and protected routes.
- Authentication: `src/firebase/auth.js`, `src/contexts/AuthContext.js`, and `src/hooks/usePhoneAuth.js` handle phone-based login and context.
- Family tree logic: `src/components/FamilyTreeAdvanced.jsx` (UI), `src/utils/FamilyTreeBuilder.js` (data structure), and `src/services/tribeService.js` (data access).
- Statistics and analytics: `src/pages/Statistics.jsx`, `src/utils/FamilyAnalytics.js`.
- Debugging: Use `src/utils/DebugLogger.js` for custom debug output.

## Developer Workflows
- **Install dependencies:** `npm install`
- **Start development server:** `npm run dev`
- **Build for production:** `npm run build`
- **Firebase functions:** See `functions/index.js` for backend logic. Deploy using Firebase CLI if needed.

## Conventions & Patterns
- All UI and logic are in `src/`, with clear separation by type: `components/`, `pages/`, `services/`, `utils/`, `contexts/`, `hooks/`.
- Family tree data is managed in Firestore; see `src/services/tribeService.js` for queries and updates.
- Use React Context for authentication state (`AuthContext`).
- Prefer D3.js for tree rendering; see `FamilyTreeAdvanced.jsx` for integration patterns.
- Debug output should use `DebugLogger.js` for consistency.
- Arabic language and RTL layout are default; ensure UI changes respect this.

## Integration Points
- Firebase config: `src/firebase/config.js`.
- Service boundaries: UI components call service functions in `services/` and `utils/`.
- External assets: All icons/images in `public/icons/`.

## Example Patterns
- To add a new page, create a component in `src/pages/` and add a route in `AppRoutes.jsx`.
- For new family tree features, update both `FamilyTreeAdvanced.jsx` (UI) and `FamilyTreeBuilder.js` (logic).
- For authentication changes, update `auth.js`, `AuthContext.js`, and related hooks.

## Notes
- Linked families and extended tree features have been removed (see README for details).
- Keep code and UI in Arabic and RTL unless explicitly changing.
- For debugging, use `DebugLogger.js` and avoid `console.log` in production code.

---
If any section is unclear or missing, please provide feedback to improve these instructions.
