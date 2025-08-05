# Special Education Data Collection Platform

A comprehensive web application for special education teachers to track student progress, manage IEP goals, and generate meaningful reports.

## Quick Start

You can start the application using either of these single commands:

### Option 1: Python Command
```bash
python main.py
```

### Option 2: NPM Command
```bash
npm start
```

### Option 3: Development Mode
```bash
npm run dev
```

## What happens when you start the app:

1. **Development Mode** (`npm run dev` or `python main.py`):
   - Starts the Express.js backend server
   - Starts the Vite development server for the React frontend
   - Enables hot module replacement for instant updates during development
   - Runs on development database

2. **Production Mode** (`npm start`):
   - Builds and starts the optimized production version
   - Runs the bundled server with all assets

## Features

- **Student Management**: Track multiple students with grade-level organization
- **Goal Tracking**: Support for frequency, percentage, and duration data collection types
- **Real-time Data Collection**: Live collection tabs with timers and counters
- **Progress Visualization**: Multiple chart types (line, bar, pie) with dynamic switching
- **Comprehensive Reporting**: PDF exports with charts and detailed progress summaries
- **IEP Calendar**: Interactive calendar showing due dates and reporting periods
- **Admin Tools**: Database verification and management capabilities

## Database

The application uses PostgreSQL with automatic schema management through Drizzle ORM.

## Authentication

Integrated with Replit Auth for secure user authentication and session management.