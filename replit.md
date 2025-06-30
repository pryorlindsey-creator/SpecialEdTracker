# Special Education Data Collection Platform

## Overview

This is a full-stack web application designed specifically for special education teachers to track student progress, manage IEP goals, and generate meaningful reports. The system provides a comprehensive data collection platform that streamlines the process of monitoring student achievements and documenting progress over time.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with proper error handling
- **Database**: PostgreSQL with Drizzle ORM
- **Connection Pooling**: Neon serverless PostgreSQL

### Build System
- **Development**: Vite with hot module replacement
- **Production**: ESBuild for server bundling
- **Package Manager**: npm with lockfile version 3
- **TypeScript**: Strict mode enabled with path mapping

## Key Components

### Authentication System
- **Provider**: Replit Auth integration
- **Strategy**: OpenID Connect with custom token handling
- **Session Storage**: PostgreSQL-backed sessions table
- **Security**: HTTP-only cookies with secure flags
- **Unauthorized Handling**: Automatic redirect to login on 401 errors

### Database Schema
- **Users**: Profile information with Replit integration
- **Students**: Linked to users with grade information
- **Goals**: IEP goals with status tracking and criteria
- **Data Points**: Progress measurements with flexible formats
- **Sessions**: Authentication session storage

### Data Management
- **ORM**: Drizzle with TypeScript-first approach
- **Migrations**: Automatic schema management
- **Validation**: Zod schemas for type safety
- **Relationships**: Proper foreign key constraints
- **Indexing**: Optimized for common query patterns

### User Interface
- **Design System**: Consistent component library
- **Responsive Design**: Mobile-first approach
- **Accessibility**: ARIA compliant components
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: Toast notifications and error boundaries

## Data Flow

### Authentication Flow
1. User accesses protected route
2. System checks for valid session
3. If unauthorized, redirects to Replit Auth
4. After successful auth, creates/updates user record
5. Establishes session with PostgreSQL storage

### Data Collection Flow
1. Teacher selects student from dashboard
2. Views active goals for that student
3. Enters progress data with flexible formats
4. System validates and stores data point
5. Updates goal progress calculations
6. Refreshes charts and analytics

### Progress Tracking Flow
1. System calculates current progress per goal
2. Computes trends and averages
3. Generates visual charts with Recharts
4. Provides export capabilities
5. Updates summary statistics

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection
- **drizzle-orm**: Database ORM and query builder
- **@tanstack/react-query**: Server state management
- **@radix-ui/react-***: Headless UI components
- **recharts**: Data visualization library
- **wouter**: Lightweight routing
- **zod**: Schema validation

### Development Dependencies
- **vite**: Development server and bundling
- **typescript**: Type checking and compilation
- **tailwindcss**: Utility-first CSS framework
- **tsx**: TypeScript execution for development

### Authentication Dependencies
- **openid-client**: OpenID Connect implementation
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

## Deployment Strategy

### Development Environment
- **Server**: Replit hosting with automatic SSL
- **Database**: Neon PostgreSQL with connection pooling
- **Hot Reload**: Vite middleware for instant updates
- **Error Handling**: Runtime error modal for debugging

### Production Build
- **Frontend**: Static assets built with Vite
- **Backend**: Bundled with ESBuild for Node.js
- **Environment**: Production mode with optimization
- **Sessions**: Persistent PostgreSQL storage

### Environment Variables
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Session encryption key
- **REPL_ID**: Replit application identifier
- **ISSUER_URL**: OpenID Connect provider URL

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- December 30, 2024: Created database administrator interface
  - Added secure admin login (sandralindsey/IsabelShea@1998)
  - Database schema viewer with field details and relationships
  - Clickable table browser with sample data
  - User management with deletion capabilities
  - System statistics dashboard
  - Navigation between admin and main application

- December 30, 2024: Fixed data point creation issues
  - Enhanced error handling and debugging
  - Added session expiration detection
  - Fixed "Add Data" button functionality on goal cards
  - Pre-selection of goals when navigating to data entry
  - Resolved date validation errors with proper type conversion
  - Fixed decimal field handling and nullable field validation

- June 30, 2025: **RESOLVED CRITICAL DATA PERSISTENCE ISSUES** 
  - **Fixed authentication system failure** - Sessions now work properly in development
  - **Confirmed complete data persistence** - Students, goals, and data points save correctly
  - **Fixed session cookie configuration** - Disabled secure flag for development environment
  - **Verified full application workflow** - End-to-end data flow working perfectly
  - **Database integration working** - All CRUD operations functioning with proper validation
  - **Authentication flow verified** - Test user creation and API protection working
  - **Progress calculations confirmed** - Goal progress updates correctly with new data points

- December 30, 2024: Added level of support field to goals
  - Updated goal creation form with support level options
  - Database schema updated to include levelOfSupport field

## Changelog

Changelog:
- June 30, 2025. Initial setup