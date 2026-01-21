import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5433,
    user: 'chugli_user',
    password: 'chugli_pass',
    database: 'chugli_db',
    ssl: false,
  },
  tablesFilter: ['!spatial_ref_sys', '!geography_columns', '!geometry_columns', '!raster_columns', '!raster_overviews'],
  verbose: true,
  strict: false,
} satisfies Config;
