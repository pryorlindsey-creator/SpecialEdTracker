# Special Education Data Collection Platform

## Overview

This is a full-stack web application for special education teachers to track student progress, manage IEP goals, and generate meaningful reports. The platform streamlines monitoring student achievements and documenting progress over time, aiming to provide a comprehensive tool for educators.

## User Preferences

Preferred communication style: Simple, everyday language.

Primary test student: User consistently works with Student 1 (ID: 5). User previously had 3 goals ("Literacy", "Behavior", and "Focus") with data points that were accidentally deleted during test data cleanup on July 18, 2025. These need to be recreated - Focus goal uses duration data collection type, Behavior uses frequency, Literacy uses percentage. All goals support full data entry workflow including duration-based measurements. All students now properly belong to user 4201332 for clean ownership during development.

Goal limits: Each student can have a maximum of 10 goals (not required to have 10). Each goal can have up to 5 objectives. Current system enforces these limits during creation.

## System Architecture

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
- **Data Point Management**: Implemented comprehensive data point editing system with dynamic forms, PATCH endpoint for updates, and real-time cache invalidation.
- **Goal and Objective Management**: Full CRUD operations for goals and objectives, with validation for limits (max 10 goals per student, max 5 objectives per goal). Objectives are directly associated with students.
- **Reporting Periods**: Configurable reporting periods (e.g., 4.5 weeks or 3 weeks) with persistent database storage, dynamic date input, and calendar integration.
- **User Ownership**: Strict user ownership system implemented to ensure data integrity and prevent cross-user data access issues.

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