# Changelog

All notable changes to this project are documented in this file.

## Release Template

Use this template for future releases:

```md
## [X.Y.Z] - YYYY-MM-DD

### Added
-

### Changed
-

### Fixed
-
```

## [0.1.1] - 2026-08-21

### Added
- Email-based candidate filtering in the admin dashboard.

### Changed
- Aligned filter behavior so email filters are applied consistently to both table view and CSV export.

### Fixed
- Improved email filter handling for unknown emails by returning empty results instead of ambiguous partial matches.

## [0.1.0] - 2026-08-21

### Added
- Initial admin panel scaffold with React + Vite.
- Supabase OTP login flow with allowlist-based admin access validation.
- Read-only interview sessions dashboard with filters, details pane, and CSV export.
- GitHub Pages deployment workflow on push to main.
- Supabase migrations and seed scripts for admin allowlist management.

### Changed
- Configured app routing and auth redirects for GitHub Pages repository subpath deployment.
- Added `npm start` command to run local dev server on port 5180.

### Fixed
- Added SPA fallback (`404.html`) in deployment flow to prevent refresh 404 on deep routes.
