# TeamBlender Rebrand QA Matrix

Date: 2026-05-15
Scope: visual and UX validation after global style refresh
Owner: Frontend

## Test Setup

1. Start frontend: npm run dev
2. Ensure backend/API is reachable for authenticated pages
3. Test on desktop and mobile widths
4. Browsers: Chrome, Edge

## Target Pages

1. /
2. /home
3. /pricing
4. /session-results/[sessionId]
5. /participant
6. /login and /signup
7. /admin

## Viewports

1. Desktop 1440x900
2. Laptop 1280x800
3. Tablet 820x1180
4. Mobile 390x844

## Acceptance Criteria

1. CTA hierarchy is clear on each screen (one dominant primary action per section)
2. Secondary violet appears only on insight, analytics, premium, and completion cues
3. Cards show depth and hierarchy without visual noise
4. Status and badges are readable and semantically distinct
5. Text contrast is readable in all major content blocks
6. Hover and focus states are visible and coherent
7. No layout break on mobile or tablet

## Component Checklist

### Buttons

1. btn-primary stands out against surrounding elements
2. btn-secondary remains clearly subordinate to primary
3. Disabled buttons are visibly disabled and not clickable
4. Focus ring is visible via keyboard navigation

### Cards

1. feature-card baseline has clear elevation
2. Hover adds subtle movement, not excessive jump
3. Priority and insight cards remain readable
4. No card shadow clipping in dense layouts

### Badges and Status

1. status-en_cours is clearly active and readable
2. status-preparee is distinct from status-en_cours
3. status-terminee is mapped to violet premium signal
4. Numeric badges remain legible on small screens

### Session Results Visual Signature

1. Insight halo is visible but subtle
2. Metrics cards alternate emphasis without overpowering content
3. Challenge rows keep readable spacing and status clarity

## Risk-Based Checks

1. Home page does not look overloaded after stronger card and button shadows
2. Pricing featured card looks premium but still professional
3. Admin remains readable with new badge and button emphasis
4. Participant screen keeps clear status-to-action mapping

## Functional Smoke Pairing

1. Login page loads and redirects correctly with valid credentials
2. Session builder catalog loads and filters work
3. Session results page renders data and statuses correctly

## Sign-Off Template

- Build status: PASS or FAIL
- Desktop visual QA: PASS or FAIL
- Mobile visual QA: PASS or FAIL
- Accessibility spot-check: PASS or FAIL
- Regression issues found: list
- Ready for production: YES or NO
