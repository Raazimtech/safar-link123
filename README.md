# EduX Administration

Standalone static administrator panel for the EduX exam system.

## Deployment

This repository is intentionally **Vercel-free**. It contains no Vercel configuration, Vercel SDK, or Vercel deployment files.

The application is a single static `index.html` and is designed to run from GitHub Pages.

## Backend

The admin panel connects directly from the browser to the configured Supabase project and EduX admin Edge Function.
