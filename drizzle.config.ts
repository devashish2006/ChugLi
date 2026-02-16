import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5433/chugli_db',
  },
  tablesFilter: ['!spatial_ref_sys', '!geography_columns', '!geometry_columns', '!raster_columns', '!raster_overviews'],
  verbose: true,
  strict: false,
} satisfies Config;
