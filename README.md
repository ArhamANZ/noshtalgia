# nosh-tal-gia

Messages that fly between Bangladesh and Japan.

A full-stack web application featuring an interactive 3D globe with flight paths connecting loved ones across borders.

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) & [TanStack Router](https://tanstack.com/router)
- **Frontend**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com/)
- **3D Visualization**: [Three.js](https://threejs.org/) & [@react-three/fiber](https://r3f.docs.pmnd.rs/)
- **Backend & Database**: [Supabase](https://supabase.com/) & [Drizzle ORM](https://orm.drizzle.team/)
- **Deployment**: [Vercel](https://vercel.com/) / [Nitro](https://nitro.unjs.io/)

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm, pnpm, or bun

### Installation

```bash
npm install
```

### Environment Variables

Configure your Supabase credentials in `.env`:

```env
SUPABASE_URL="https://<project-id>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
VITE_SUPABASE_URL="https://<project-id>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<publishable-key>"
```

### Development

```bash
npm run dev
```

### Testing

```bash
npm run test
```

### Build

```bash
npm run build
```

## Deployment to Vercel

1. Push this repository to GitHub.
2. Import the project into Vercel.
3. Configure the environment variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in your Vercel project settings.
4. Deploy! Vercel automatically detects the TanStack Start framework configuration.
