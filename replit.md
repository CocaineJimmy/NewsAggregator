# Minsk News Aggregator

## Overview

This is a full-stack news aggregator platform for Minsk, built with React (frontend) and Express.js (backend). The application allows users to browse news articles by category, comment on articles, and earn XP/levels through engagement. Admin users can manage content, users, and view platform statistics.

The platform emphasizes content-first design inspired by Medium, Apple News, and Duolingo, featuring clean typography, smooth transitions, and minimalist aesthetics.

**Recent Updates (October 26, 2025):**
- Fixed critical XP exploit: Added unique constraint on news_views(userId, newsId) to prevent duplicate XP awards
- Fixed cache invalidation consistency: All mutations now use standardized query key ['/api', 'me'] for proper XP/level updates
- AuthContext now properly handles 401 responses for unauthenticated users
- Removed hardcoded SESSION_SECRET fallback for improved security

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tools:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching

**UI Components:**
- shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom theme configuration
- Design system follows "New York" style variant from shadcn
- Custom color system with CSS variables for theming (light/dark mode support)
- Typography hierarchy using Inter (interface/headings) and Lora (article text) fonts from Google Fonts

**State Management:**
- React Context API for authentication state (AuthContext)
- TanStack Query for server state caching and synchronization
- Session-based authentication with cookies

**Key Design Patterns:**
- Mobile-first responsive design with breakpoints: sm(640), md(768), lg(1024), xl(1280)
- Component composition pattern with reusable UI primitives
- Custom hooks for common functionality (use-toast, use-mobile)
- Reference-based design emphasizing content hierarchy and clean layouts

### Backend Architecture

**Framework & Runtime:**
- Express.js server with TypeScript
- ES modules (type: "module" in package.json)
- Development: tsx for TypeScript execution
- Production: esbuild for bundling

**Session Management:**
- express-session with PostgreSQL session store (connect-pg-simple)
- HTTP-only cookies for security
- 30-day session expiration
- Session secret required via environment variable

**API Design:**
- RESTful API endpoints organized in routes.ts
- Middleware-based authentication (requireAuth, requireAdmin)
- Form data handling with multer for file uploads (images)
- Zod schema validation for request payloads

**File Upload Strategy:**
- Multer configured for handling news article images
- File storage location managed through server configuration

### Data Storage

**Database:**
- PostgreSQL via Neon serverless database
- Drizzle ORM for type-safe database queries and schema management
- WebSocket support for Neon's serverless architecture

**Schema Design (shared/schema.ts):**

*Users Table:*
- UUID primary keys
- Email/username uniqueness constraints
- Hashed passwords (not plaintext - requires bcrypt implementation)
- Gamification: XP and level tracking
- Admin and blocked status flags
- Avatar URL support

*Categories Table:*
- News categorization (Events, News, Economy, Tech, Sports)
- Slug-based routing

*News Table:*
- Title, excerpt, content fields
- Category and author relationships
- Image URL storage
- View count tracking
- Timestamps for creation

*Comments Table:*
- User and news article relationships
- Content and timestamps
- Supports threaded discussions

*News Views Table:*
- Tracks individual article views
- Prevents duplicate counting

**Migration Strategy:**
- Drizzle Kit for schema migrations
- Migration files stored in ./migrations directory
- Seed script for initial data (admin user, default categories)

### External Dependencies

**Database & Infrastructure:**
- Neon (@neondatabase/serverless) - Serverless PostgreSQL hosting
- Requires DATABASE_URL environment variable
- WebSocket constructor configuration for serverless compatibility

**Authentication & Sessions:**
- express-session - Session middleware
- connect-pg-simple - PostgreSQL session store
- Requires SESSION_SECRET environment variable

**File Upload:**
- multer - Multipart form-data handling for image uploads
- File storage configuration in server/routes.ts

**Validation:**
- Zod - Runtime type validation and schema definition
- drizzle-zod - Bridge between Drizzle schema and Zod validators
- zod-validation-error - User-friendly error messages

**Development Tools:**
- Replit-specific plugins for development experience:
  - @replit/vite-plugin-runtime-error-modal
  - @replit/vite-plugin-cartographer
  - @replit/vite-plugin-dev-banner

**Date Handling:**
- date-fns with Russian locale (ru) for date formatting
- formatDistanceToNow for relative timestamps

**UI Libraries:**
- @radix-ui/* - Accessible UI primitives (20+ components)
- class-variance-authority - Type-safe component variants
- cmdk - Command palette component
- lucide-react - Icon library

**Build & Development:**
- TypeScript with strict mode enabled
- PostCSS with Tailwind CSS and Autoprefixer
- Path aliases configured: @/ (client), @shared/ (shared schemas)

### Security Considerations

**Required Environment Variables:**
- DATABASE_URL - PostgreSQL connection string
- SESSION_SECRET - Cryptographic secret for session signing

**Authentication Flow:**
- Session-based authentication (not JWT)
- Middleware guards for protected routes
- Role-based access control (admin vs regular users)

**Production Settings:**
- Secure cookies enabled in production (HTTPS only)
- HTTP-only cookies to prevent XSS attacks
- CSRF protection should be implemented

### Deployment Architecture

**Build Process:**
1. Frontend: Vite builds to dist/public
2. Backend: esbuild bundles server to dist/index.js
3. Static files served from dist/public

**Development vs Production:**
- Development: Vite dev server with HMR
- Production: Express serves built static files
- Conditional Replit plugin loading based on NODE_ENV