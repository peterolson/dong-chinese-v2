[![CI](https://github.com/peterolson/dong-chinese-v2/actions/workflows/ci.yml/badge.svg)](https://github.com/peterolson/dong-chinese-v2/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/peterolson/dong-chinese-v2/branch/master/graph/badge.svg)](https://codecov.io/gh/peterolson/dong-chinese-v2)

# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv create --template minimal --types ts --add prettier eslint vitest="usages:component,unit" playwright sveltekit-adapter="adapter:node" devtools-json drizzle="database:postgresql+postgresql:postgres.js+docker:yes" better-auth="demo:password,github" storybook mcp="ide:claude-code,vscode+setup:remote" --install npm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
