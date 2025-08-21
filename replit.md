# CompetitorScope - Competitive Intelligence Web App

## Overview

CompetitorScope is a modern web application designed for competitive analysis and price monitoring across e-commerce competitors. The system allows users to track competitors by categories (like Automotive) and product types (like Jump Starters), monitor brand coverage, track pricing changes, and generate competitive intelligence dashboards. The application focuses on scraping competitor websites to collect product data, pricing information, and inventory status while providing insights on coverage gaps and pricing opportunities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite as the build tool and development server
- **Routing**: Wouter for client-side routing with a clean, component-based structure
- **UI Components**: Shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and API data caching
- **Styling**: Tailwind CSS with custom CSS variables for theming and a "new-york" style configuration

### Backend Architecture
- **Server Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API architecture with dedicated route handlers for different entities
- **Development Integration**: Vite middleware integration for seamless full-stack development
- **Error Handling**: Centralized error handling middleware with structured error responses

### Data Storage
- **Database**: PostgreSQL configured through Drizzle ORM
- **Schema Design**: Relational database with tables for competitors, categories, product types, pages, products, price snapshots, and tracking metadata
- **Database Provider**: Configured for Neon Database in production with PostgreSQL dialect
- **Migrations**: Drizzle Kit for database schema migrations and management

### Key Data Entities
- **Competitors**: Store competitor information including site domains and tracking status
- **Categories & Product Types**: Hierarchical organization of products (e.g., Automotive → Jump Starters)
- **Pages**: URLs to scrape with page type classification (PLP/PDP) and tracking metadata
- **Products**: Product catalog with brand normalization, specifications, and competitor associations
- **Price Snapshots**: Historical pricing data with timestamps for trend analysis
- **Tasks**: Scraping task management with status tracking

### Frontend Application Structure
- **Dashboard**: Main analytics view with KPI metrics, brand coverage matrix, and price band analysis
- **Product Catalog**: Comprehensive product listing with filtering and detailed product modals
- **Competitor Management**: CRUD operations for competitor setup and configuration
- **Page Management**: Interface for managing scraping targets and monitoring page status
- **Category Explorer**: Hierarchical view of product categories and types
- **Change Tracking**: Recent changes view with filtering and timeline analysis
- **Admin Panel**: System administration and configuration management

## External Dependencies

### UI and Component Libraries
- **Radix UI**: Comprehensive set of accessible UI primitives for building the component system
- **Shadcn/ui**: Pre-built component library providing consistent design patterns
- **Lucide React**: Icon library for consistent iconography throughout the application

### Development and Build Tools
- **Vite**: Fast build tool and development server with TypeScript support
- **ESBuild**: JavaScript bundler for production builds
- **TypeScript**: Type safety across the entire application stack

### Database and ORM
- **Drizzle ORM**: Type-safe ORM for PostgreSQL with schema definition and query building
- **Neon Database**: Cloud PostgreSQL provider for production deployment
- **Drizzle Kit**: Database migration and schema management tools

### Data Processing and Validation
- **Zod**: Runtime type validation and schema parsing for API endpoints and forms
- **React Hook Form**: Form handling with validation integration
- **Date-fns**: Date manipulation and formatting utilities

### Styling and CSS
- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **PostCSS**: CSS processing with autoprefixer for browser compatibility
- **Class Variance Authority**: Utility for creating consistent component variants

### Development Experience
- **Replit Integration**: Development environment integration with error handling and live reload
- **Wouter**: Lightweight routing solution for single-page application navigation