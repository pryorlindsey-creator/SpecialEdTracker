# Special Education Data Collection Platform

## Overview

This is a full-stack web application for special education teachers to track student progress, manage IEP goals, and generate meaningful reports. The platform streamlines monitoring student achievements and documenting progress over time, aiming to provide a comprehensive tool for educators.

## User Preferences

Preferred communication style: Simple, everyday language.

Primary test student: User consistently works with Student 1 (ID: 5). User previously had 3 goals ("Literacy", "Behavior", and "Focus") with data points that were accidentally deleted during test data cleanup on July 18, 2025. These need to be recreated - Focus goal uses duration data collection type, Behavior uses frequency, Literacy uses percentage. All goals support full data entry workflow including duration-based measurements. All students now properly belong to user 4201332 for clean ownership during development.

Goal limits: Each student can have a maximum of 10 goals (not required to have 10). Each goal can have up to 5 objectives. Current system enforces these limits during creation.

## System Architecture

### Data Safety Measures
- **Database schema changes**: Always use `npm run db:push --force` for safe schema synchronization to prevent data loss during development.
- **Data backup**: Critical data like goals and objectives should be backed up before any schema modifications.
- **User data protection**: All data belongs to user 4201332 during development with strict ownership verification.

### UI/UX Decisions
- Consistent design system using Radix UI components with shadcn/ui.
- Tailwind CSS for styling and custom theming.
- Mobile-first responsive design.
- ARIA compliant components for accessibility.
- Visual elements include skeleton loaders, spinners, toast notifications, error boundaries, and color-coded calendar events.
- Professional landing page with a clean white background and dark blue text, showcasing core features and calls to action.
- Interactive calendar displaying IEP due dates and reporting periods.
- Grade-level student organization on the dashboard with visual headers and student count badges.
- Enhanced chart visualizations with evenly spaced Y-axis tick marks, smart interval calculation, and consistent percentage display for professional reporting.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, TanStack Query for server state, Wouter for routing, React Hook Form with Zod validation, Recharts for data visualization.
- **Backend**: Node.js with Express.js, TypeScript with ESM modules, RESTful API design.
- **Authentication**: Replit Auth with OpenID Connect, Express sessions with PostgreSQL storage, HTTP-only cookies. Authentication can be disabled for development for simplified workflow.
- **Database**: PostgreSQL with Drizzle ORM, Neon serverless PostgreSQL for connection pooling.
- **Build System**: Vite for development, ESBuild for production server bundling, npm for package management. TypeScript strict mode enabled.
- **Data Management**: Drizzle ORM for schema management, Zod for type-safe validation, proper foreign key constraints, and optimized indexing.
- **Data Flow**: Secure authentication flow, streamlined data collection, and robust progress tracking. Data persistence is confirmed across sessions and server restarts.
- **Data Collection Enhancements**: Dynamic form inputs adapting to goal types (percentage, frequency, duration), real-time live collection tab with session-based tracking, frequency counters, duration timers, and percentage trial counters. Support for multi-student group data collection.
- **Reporting**: Comprehensive raw data table with filtering, sorting, and PDF export capabilities. Individual goal scatterplots with goal-specific data filtering and trend lines. Clean Goal Summary Reports without "Recent Performance" statements for professional presentation.
- **Chart Visualization**: Multiple chart types (line, bar, pie) with dropdown selection on goal cards, sessionStorage preferences, and dynamic chart type switching with proper icons and user-friendly interface.
- **Data Point Management**: Implemented comprehensive data point editing system with dynamic forms, PATCH endpoint for updates, and real-time cache invalidation. Fixed timezone-related date consistency issues in live data collection to ensure recorded dates match data dates. Resolved critical TypeScript errors that caused application crashes when adding data points to goals (August 31, 2025), ensuring stable data entry functionality across all goal types.
- **Goal and Objective Management**: Full CRUD operations for goals and objectives, with validation for limits (max 10 goals per student, max 5 objectives per goal). Objectives are directly associated with students. Custom Level of Support functionality allows users to create personalized support levels during goal creation, which automatically appear in data collection interfaces. Modal scrolling issues resolved with proper height constraints and inline styling (August 30, 2025). Enhanced Add Goal Modal with prominent objectives section allows users to add up to 5 objectives during goal creation, with improved visual design including objective counter, helpful guidance text, and professional styling (August 31, 2025). Both goals and objectives include comprehensive delete functionality with confirmation dialogs. Objective creation streamlined by removing title field requirement and adding target date field for better focus on meaningful content (August 31, 2025). Database schema updated to make objective title field optional while maintaining backward compatibility. **Unified Goal and Objective Data Collection**: Implemented comprehensive unified system where goal and objective data points are combined into single charts while maintaining individual objective chart options. Enhanced data entry forms support both general goal and objective-specific data collection with visual indicators (blue for general goal, green for objectives). Raw Data table and Reports section now display both data types with proper labeling and objective descriptions (August 31, 2025).
- **Reporting Periods**: Configurable reporting periods (e.g., 4.5 weeks or 3 weeks) with persistent database storage, dynamic date input, and calendar integration.
- **User Ownership**: Strict user ownership system implemented to ensure data integrity and prevent cross-user data access issues.
- **Production Readiness**: Application fully prepared for external deployment with comprehensive security configurations, documentation, and deployment guides. All development files cleaned up and debug logging removed.

## External Dependencies

### Core Dependencies
- `@neondatabase/serverless`: PostgreSQL connection
- `drizzle-orm`: Database ORM and query builder
- `@tanstack/react-query`: Server state management
- `@radix-ui/react-***`: Headless UI components
- `recharts`: Data visualization library
- `wouter`: Lightweight routing
- `zod`: Schema validation

### Authentication Dependencies
- `openid-client`: OpenID Connect implementation
- `passport`: Authentication middleware
- `express-session`: Session management
- `connect-pg-simple`: PostgreSQL session store