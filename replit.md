# LUXETTE Luxury Consignment Management System

## Overview
LUXETTE is a comprehensive luxury consignment management system designed for businesses dealing with pre-owned luxury goods. It provides an end-to-end solution for managing inventory, tracking sales, processing payments (including installment plans), handling vendor relationships and payouts, and generating detailed financial and business intelligence reports. The system aims to streamline the entire consignment lifecycle from item intake to sale and profitability analysis, offering a robust platform for efficient business operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The system is built with a modern web stack. The frontend utilizes React 18 with TypeScript, Wouter for routing, TanStack Query for data fetching, and Tailwind CSS with shadcn/ui for UI components. The backend is developed using Node.js with Express.js and TypeScript, interacting with a PostgreSQL database via Drizzle ORM. Authentication is session-based, with session data stored in PostgreSQL. Google Cloud Storage is used for image storage. The system incorporates a multi-role user management system and tracks core entities like vendors, clients, items, brands, and categories, along with transactions such as client payments, vendor payouts, and item expenses. Installment plans and contract management with PDF generation are also core features. API design follows RESTful principles with Zod schemas for validation and centralized error handling.

## External Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **Cloud Storage**: Google Cloud Storage (for item images)
- **PDF Generation**: React PDF (for contracts)
- **Image Processing**: Sharp (for compression)