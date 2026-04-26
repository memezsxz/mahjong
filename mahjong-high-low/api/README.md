# API App

This project is the Nest application shell. It should assemble backend features and infrastructure, while keeping feature behavior in dedicated libraries.

## This project should hold

- Nest bootstrap code, root module wiring, and global middleware or configuration.
- Infrastructure setup such as database connection, environment configuration, and app-wide interceptors or filters.
- Registration of backend feature modules such as leaderboard.

## This project should not hold

- Feature-specific controllers, services, repositories, or schemas. Those belong in libraries under `libs/api`.
- Shared contracts or game rules. Those belong in `libs/shared`.
- Frontend storage or gameplay state logic.

## Dependency role

- Depend on backend feature libraries and compose them into the running API.
- Stay thin; when new backend capability appears, add a feature library first and wire it here second.
