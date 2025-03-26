# Iraq Tourism CMS Implementation Plan

## Overview

This document outlines the development plan for a Content Management System (CMS) to manage the Iraq Tourism application data stored in Firebase Firestore. The CMS will provide administrators with an intuitive, English-only interface with a dark theme to manage tourism listings, categories, and user data.

## Project Goals

1. Create a secure, efficient CMS for managing the tourism app data
2. Implement a responsive, dark-themed admin interface
3. Support bilingual content entry (Arabic/English) within form fields
4. Provide comprehensive CRUD operations for all collections
5. Follow best practices for security, performance, and usability
6. Enable media management for listing images

## Tech Stack

- **Frontend Framework**: Next.js with TypeScript
- **UI Library**: Tailwind CSS + Headless UI (for dark theme support)
- **Component Library**: Shadcn/UI (built on Radix UI primitives)
- **State Management**: React Query + Context API
- **Form Management**: React Hook Form + Zod for validation
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics

## Project Structure

```
iraq-tourism-cms/
├── app/                  # Next.js 13+ app directory structure
│   ├── (auth)/           # Authentication routes group
│   │   ├── login/        # Login page
│   │   └── forgot-password/ # Password recovery
│   ├── (dashboard)/      # Dashboard routes group (protected)
│   │   ├── page.tsx      # Dashboard home
│   │   ├── categories/   # Categories management
│   │   ├── listings/     # Listings management
│   │   └── settings/     # System settings
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout
├── components/           # Reusable UI components
│   ├── layout/           # Layout components
│   │   ├── sidebar.tsx   # Main navigation sidebar
│   │   ├── header.tsx    # App header with user info
│   │   └── shell.tsx     # App shell with responsive layout
│   ├── ui/               # Core UI components following Shadcn pattern
│   ├── forms/            # Form-specific components
│   │   ├── category-form.tsx
│   │   ├── listing-form.tsx
│   │   └── bilingual-input.tsx # Special component for Arabic/English inputs
│   └── data/             # Data display components
│       ├── data-table.tsx
│       └── filters.tsx
├── lib/                  # Utility functions and configurations
│   ├── firebase.ts       # Firebase initialization
│   ├── db.ts             # Firestore database utilities
│   ├── auth.ts           # Authentication utilities
│   ├── storage.ts        # Firebase storage utilities
│   └── utils.ts          # Helper functions
├── hooks/                # Custom React hooks
│   ├── use-firestore.ts  # Firestore data hooks
│   ├── use-auth.ts       # Authentication hooks
│   └── use-media.ts      # Media handling hooks
├── providers/            # Context providers
│   ├── auth-provider.tsx # Authentication context
│   └── theme-provider.tsx # Dark theme provider
├── types/                # TypeScript type definitions
│   ├── schema.ts         # Zod schemas for validation
│   └── database.ts       # Firestore data types
├── public/               # Static assets
├── styles/               # Global styles
└── middleware.ts         # Auth & routing middleware
```

## UI/UX Design Principles

### Dark Theme Implementation

- **Color Palette**: Dark gray backgrounds (#121212, #1E1E1E) with accent colors
- **Contrast Ratio**: Maintain WCAG AA compliance (4.5:1 for normal text)
- **Visual Hierarchy**: Use contrasting elements to guide attention
- **Consistent Styling**: Apply dark theme consistently across all components

### Responsive Design

- Mobile-first approach with progressive enhancement
- Breakpoints:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- Sidebar collapses to bottom navigation on mobile
- Adaptive tables that reformat on smaller screens
- Touch-friendly UI elements on mobile

### Accessibility Standards

- Semantic HTML structure
- ARIA attributes where needed
- Keyboard navigation support
- Focus management
- Screen reader compatibility

## Core Features Implementation

### 1. Authentication & Authorization

- Admin login page with email/password authentication
- Role-based access control (super_admin, admin, editor)
- Protected routes with authentication checks
- Session management and token handling
- Account recovery flow

### 2. Navigation & Layout

- Responsive sidebar navigation that collapses on mobile
- Dark theme with consistent styling
- Breadcrumb navigation for deeper pages
- Quick action buttons for common tasks
- Search functionality across the application

### 3. Dashboard

- Overview of key metrics (total listings, categories, users)
- Recent activity log
- Quick access cards to common tasks
- Content distribution and engagement charts
- System status indicators

### 4. Categories Management

- Table view with sorting, filtering, and pagination
- Create/edit form with fields:
  - English name (name_en)
  - Arabic name (name_ar)
  - Icon selection
- Batch operations (delete, activate/deactivate)
- Drag-and-drop reordering

### 5. Listings Management

- Master list with advanced filtering options
- List/Grid view toggle
- Detailed form for creating/editing listings with:
  - Basic information in both languages (names, descriptions)
  - Location information with map selector
  - Category selection
  - Image management with preview
  - Type-specific details sections
- Bulk operations
- Preview functionality
- Duplicate listing option

### 6. Bilingual Content Management

- Specialized input components for bilingual fields
- Toggle to preview content in either language
- Form validation for required fields in both languages
- Consistent UI pattern for language-specific inputs

### 7. Media Management

- Drag-and-drop image upload
- Image preview with crop/resize options
- Gallery view for listing images
- Bulk upload support
- Image optimization

### 8. Data Modeling

TypeScript interfaces with Zod validation schemas:

```typescript
// Core interfaces with validation schemas
const categorySchema = z.object({
  id: z.string().optional(),
  name_en: z.string().min(2, "English name is required"),
  name_ar: z.string().min(2, "Arabic name is required"),
  created_at: z.any().optional(),
  updated_at: z.any().optional(),
});

const listingSchema = z.object({
  id: z.string().optional(),
  name_en: z.string().min(3, "English name is required"),
  name_ar: z.string().min(3, "Arabic name is required"),
  description_en: z.string().min(10, "English description is required"),
  description_ar: z.string().min(10, "Arabic description is required"),
  address_en: z.string().optional(),
  address_ar: z.string().optional(),
  city_en: z.string(),
  city_ar: z.string(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  latitude: z.number().or(z.string().transform(Number)),
  longitude: z.number().or(z.string().transform(Number)),
  categories: z.array(z.string()),
  // Additional fields based on listing type
});

type Category = z.infer<typeof categorySchema>;
type Listing = z.infer<typeof listingSchema>;

// Additional specialized schemas for different listing types
```

## Implementation Phases

### Phase 1: Project Setup and Core UI (Week 1)

1. Initialize Next.js 13+ project with TypeScript and Tailwind CSS
2. Set up Firebase configuration and authentication
3. Implement dark theme using Tailwind and CSS variables
4. Create responsive layout components (sidebar, header, shell)
5. Build authentication flow (login, logout, protected routes)
6. Implement basic dashboard structure

### Phase 2: Data Management Foundations (Week 2)

1. Create reusable data table component with sorting/filtering
2. Implement form components with bilingual support
3. Build categories CRUD functionality
4. Create media upload components
5. Set up Firestore hooks for data fetching
6. Implement basic error handling and loading states

### Phase 3: Listings Management (Week 3)

1. Build comprehensive listing form with conditional fields
2. Implement listing list view with advanced filters
3. Create specialized components for different listing types
4. Build image gallery and management functionality
5. Implement map selection for locations
6. Add preview and duplicate functionality

### Phase 4: Advanced Features and Polish (Week 4)

1. Implement user management and permissions
2. Add batch operations for listings and categories
3. Create advanced dashboard with analytics
4. Implement settings page for system configuration
5. Add comprehensive error handling and validation
6. Optimize performance and loading states

### Phase 5: Testing and Deployment (Week 5)

1. Comprehensive cross-browser testing
2. Mobile responsiveness testing
3. Accessibility audit and fixes
4. Performance optimization
5. Deployment to production
6. Documentation and training materials

## Responsive Design Implementation

### Mobile View (< 640px)
- Bottom navigation bar instead of sidebar
- Stacked form fields
- Simplified tables as cards
- Full-width content
- Touch-optimized inputs

### Tablet View (640px - 1024px)
- Collapsible sidebar
- Responsive grid layouts (2-column)
- Optimized tables with fewer visible columns
- Adapted form layouts

### Desktop View (> 1024px)
- Expanded sidebar with categories
- Multi-column layouts
- Full data tables
- Side-by-side form fields when appropriate

## Performance Optimization

- Code splitting and lazy loading
- Image optimization with next/image
- Efficient Firestore queries with pagination
- Memoization of expensive components
- Debounced search inputs
- Virtualized lists for large datasets

## Security Considerations

- Implement Firebase security rules for Firestore
- Set up proper authentication and authorization checks
- Server-side validation of all inputs
- Protection against XSS and CSRF attacks
- Implement rate limiting for API endpoints
- Regular security audits

## Deployment Strategy

1. Set up CI/CD pipeline with GitHub Actions
2. Implement staging environment for testing
3. Configure environment variables securely
4. Set up monitoring and error tracking
5. Implement automated testing

## Future Enhancements

- Advanced analytics dashboard
- Export data to CSV/Excel
- Email notifications system
- Multi-factor authentication
- Audit logging for all actions
- Automated backup system

## Success Criteria

- Intuitive, responsive dark-themed UI that works on all devices
- Complete CRUD operations for all entity types
- Secure, role-based access control
- Efficient media management
- Fast performance with optimized loading states
- Comprehensive error handling and validation 