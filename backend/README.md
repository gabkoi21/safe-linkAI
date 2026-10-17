# FastAPI Project - Backend

## Requirements

* [Docker](https://www.docker.com/).
* [uv](https://docs.astral.sh/uv/) for Python package and environment management.

## Local Development

Run the backend locally and connect it to PostgreSQL in Docker Compose.

From the project root, start PostgreSQL and Mailpit:

```console
$ docker compose up -d db mailpit
```

Then, from `./backend/`, install the dependencies, prepare the database, and start the development server:

```console
$ uv sync
$ uv run bash scripts/prestart.sh
$ uv run fastapi dev
```

The API is available at `http://localhost:8000`, with automatic interactive docs at `http://localhost:8000/docs`.

### Windows PowerShell without uv

From the project root, create and install a backend-local environment:

```powershell
python -m venv backend/.venv
python -m pip --python backend/.venv/Scripts/python.exe install -e ./backend
```

Then start the API from the `backend` directory:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

To start without activating an environment, run `./start.ps1` from `backend`.
This uses `backend/.venv` explicitly. The uv workspace workflow above instead
uses `.venv` in the project root; install dependencies in the environment you use.

The API docs and health check work without PostgreSQL. Login and data operations
require the database and migrations described above. Stop an existing backend
before starting another server on port 8000.

## SafeLink message analysis

Set `GOOGLE_API_KEY` in the root `.env`. `GOOGLE_AI_MODEL` defaults to
`gemma-4-26b-a4b-it`. Install dependencies after pulling changes (`uv sync`, or
`python -m pip install -e .` inside the activated backend environment), apply
`alembic upgrade head`, and start the backend. No new migration is required for
message analysis; it uses the existing SafeLink tables.

`POST /api/v1/analysis/message` accepts `{"message": "Text to check"}` (1–20,000
characters). It returns HTTP 201 with `submission_id`, `report_id`, `model_version`,
`risk_score`, `risk_level`, `summary`, `recommended_action`, and `findings`.
Findings contain `title`, `description`, `severity`, and optional quoted `evidence`.

The endpoint currently supports guests. Submissions are saved privately without
an account owner. Message text is sent to Google AI and stored in PostgreSQL with
its report. The API key stays on the backend. Reports assess message content;
they do not verify identities, fetch links, or guarantee safety.

Provider failures create a failed report without a risk score. Invalid model
output is rejected. Errors return a readable `detail` with HTTP 429 (quota),
502 (provider/invalid output), 503 (configuration/database), or 504 (timeout).
No generated example is substituted. URL and file analysis remain unavailable.

Run isolated tests without connecting to Google or PostgreSQL:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s unit_tests -v
```

## General Workflow

Run backend commands from `./backend/` with `uv run`. Make sure your editor uses the Python interpreter at `.venv/bin/python` in the project root.

Modify or add SQLModel models for data and SQL tables in `./backend/app/models.py`, API endpoints in `./backend/app/api/`, CRUD (Create, Read, Update, Delete) utils in `./backend/app/crud.py`.

## VS Code

There are already configurations in place to run the backend through the VS Code debugger, so that you can use breakpoints, pause and explore variables, etc.

The setup is also already configured so you can run the tests through the VS Code Python tests tab.

## Full Stack with Docker Compose

To run the backend and built frontend in Docker Compose:

```console
$ docker compose run --rm backend bash scripts/prestart.sh
$ docker compose watch
```

The application is available at `http://localhost:8000`.

### Docker Compose Override

The `compose.override.yml` file contains local settings for published ports, source synchronization, automatic image rebuilds, and backend reloads. Docker Compose applies it automatically when you run `docker compose` without an explicit file list.

To open a shell in the backend container:

```console
$ docker compose exec backend bash
```

## Backend Tests

To test the backend from the `backend` directory, run:

```console
$ uv run bash scripts/test.sh
```

The tests run with Pytest. Modify existing tests or add new ones in `./backend/tests/`.

If you use GitHub Actions, the tests will run automatically.

### Test a Running Stack

If your stack is already up and you just want to run the tests, you can use:

```bash
docker compose exec backend bash scripts/tests-start.sh
```

The `/app/backend/scripts/tests-start.sh` script calls `pytest`. If you need to pass extra arguments to `pytest`, you can pass them to that command and they will be forwarded.

For example, to stop on first error:

```bash
docker compose exec backend bash scripts/tests-start.sh -x
```

### Test Coverage

When the tests run, they generate `htmlcov/index.html`. Open it in your browser to inspect the test coverage.

## Migrations

Make sure you create a revision of your models and upgrade the database with that revision every time you change them. From the `backend` directory, use `uv` to run Alembic against the PostgreSQL container:

* Alembic is already configured to import your SQLModel models from `./backend/app/models.py`.

* After changing a model (for example, adding a column), create a revision:

```console
$ uv run alembic revision --autogenerate -m "Add column last_name to User model"
```

* Commit to the git repository the files generated in the alembic directory.

* After creating the revision, run the migration in the database (this is what will actually change the database):

```console
$ uv run alembic upgrade head
```

If you don't want to use migrations at all, uncomment the lines in the file at `./backend/app/core/db.py` that end in:

```python
SQLModel.metadata.create_all(engine)
```

and comment the line in the file `scripts/prestart.sh` that contains:

```console
$ alembic upgrade head
```

If you don't want to start with the default models and want to remove them / modify them, from the beginning, without having any previous revision, you can remove the revision files (`.py` Python files) under `./backend/app/alembic/versions/`. And then create a first migration as described above.

## Email Templates

The email templates are written with [React Email](https://react.email) in `./packages/react-email/`. The `emails` directory holds one component per email and the `ui` directory holds the shared components (layout, heading, button, link, callout).

The rendered HTML in `./backend/app/email-templates/` is generated from those components. It is what the application sends and should not be edited by hand.

To preview the emails while editing them, start the dev server from the root of the project:

```console
$ bun run email:dev
```

Values coming from the backend are declared as Jinja placeholders in the component props, for example `username = "{{ username }}"`. The context for each email is built in `generate_*_email()` in `./backend/app/utils.py`, so a new placeholder needs to be added there too.

Once you are done, regenerate the templates used by the application:

```console
$ bun run email:export
```
