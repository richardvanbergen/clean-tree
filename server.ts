import index from './examples/index.html';

const server = Bun.serve({
  port: 3001,
  routes: {
    '/': index,
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at http://localhost:${server.port}`);
