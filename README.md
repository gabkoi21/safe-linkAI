# SafeLink AI

SafeLink AI helps people review suspicious messages and URLs for signs of scams and other threats.

## Features

- Message analysis through Google AI, with saved reports.
- URL pattern analysis and Google Safe Browsing reputation checks.
- Risk indicators, findings, and suggested safety actions.
- Account management, password recovery, and dark mode.

Analysis is an assessment, not a guarantee of safety. Unavailable reputation checks are shown explicitly. File analysis is not connected yet.

## Local development

1. Copy `.env.example` to `.env` and configure the database, application secret, and Google API credentials.
2. Follow [development.md](development.md) to start the database and backend.
3. Run `bun install` and `bun run dev` from the project root to start the frontend.
4. Open http://localhost:5173.

Submitted messages and URLs are sent to Google services and saved by the backend. Selected files remain on your device.

## Project structure

- `frontend/`: React and TypeScript application.
- `backend/`: Python API, analysis services, and database migrations.
- `packages/react-email/`: account email templates.
- `docs/`: project planning and supporting documentation.

The backend uses FastAPI, SQLModel, and PostgreSQL. The frontend uses Vite, TanStack Router, and Tailwind CSS.

## Documentation

- [Backend](backend/README.md)
- [Frontend](frontend/README.md)
- [Development](development.md)
- [Deployment](deployment.md)
- [Docker Compose deployment](deployment-docker-compose.md)

## License

See [LICENSE](LICENSE) for the MIT license and retained third-party copyright notice.
