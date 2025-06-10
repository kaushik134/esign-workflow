// config/app.config.ts
export default () => ({
  port: 8001,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '', 10) || 5432,
  },
});
