init:
	npx create-nx-workspace@latest mahjong-high-low --preset=empty --nxCloud=skip --telemetry=false

	cd mahjong-high-low

	export NX_IGNORE_UNSUPPORTED_TS_SETUP=true

	npm install -D @nx/angular @nx/nest @nx/js

	# Angular frontend
	npx nx g @nx/angular:app web \
	  --style=scss \
	  --routing=true \
	  --standalone=true \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --bundler=esbuild \
	  --ssr=false \
	  --e2eTestRunner=none \
	  --tags=type:app,scope:web

	# NestJS backend
	npx nx g @nx/nest:app api \
	  --frontendProject=web \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --e2eTestRunner=none \
	  --tags=type:app,scope:api

	npx nx g @nx/angular:setup-tailwind web

	# Shared models
	npx nx g @nx/js:lib models \
	  --directory=libs/shared/models \
	  --importPath=@hbg/shared-models \
	  --bundler=none \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --tags=type:util,scope:shared

	# Shared pure game logic
	npx nx g @nx/js:lib util-game \
	  --directory=libs/shared/util-game \
	  --importPath=@hbg/shared-util-game \
	  --bundler=none \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --tags=type:util,scope:shared

	# State management + HTTP + services
	npx nx g @nx/angular:lib \
	  --name=data-access \
	  --directory=libs/game/data-access \
	  --importPath=@hbg/game-data-access \
	  --standalone=true \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --tags=type:data-access,scope:game

	# All page-level smart components
	npx nx g @nx/angular:lib \
	  --name=feature \
	  --directory=libs/game/feature \
	  --importPath=@hbg/game-feature \
	  --standalone=true \
	  --routing=true \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --tags=type:feature,scope:game

	# All dumb/presentational components
	npx nx g @nx/angular:lib \
	  --name=ui \
	  --directory=libs/game/ui \
	  --importPath=@hbg/game-ui \
	  --standalone=true \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --tags=type:ui,scope:game

	# NestJS leaderboard lib
	npx nx g @nx/nest:lib \
	  --name=leaderboard \
	  --directory=libs/api/leaderboard \
	  --importPath=@hbg/api-leaderboard \
	  --linter=eslint \
	  --unitTestRunner=jest \
	  --tags=type:feature,scope:api

	npm install primeng @primeng/themes primeicons

	# Tailwind PrimeNG integration plugin
	npm install tailwindcss-primeui

	# NgRx Component Store
	npm install @ngrx/component-store

	# NestJS MongoDB / Mongoose
	npm install @nestjs/mongoose mongoose

	# PostCSS (needed for Tailwind v4)
	npm install -D @tailwindcss/postcss postcss

	# Config read to read from .env
	npm install @nestjs/config

run_db_container:
	docker run -d \
      --name mongodb \
      -p 27017:27017 \
      -e MONGO_INITDB_ROOT_USERNAME=admin \
      -e MONGO_INITDB_ROOT_PASSWORD=password \
      mongo:latest

