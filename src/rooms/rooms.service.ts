import { Injectable } from '@nestjs/common';
import { db } from '../db';
import { sql } from 'drizzle-orm';

@Injectable()
export class RoomsService {

  async createRoom(
    name: string,
    lat: number,
    lng: number,
  ) {
    const result = await db.execute(sql`
      INSERT INTO rooms (id, name, location, expires_at)
      VALUES (
        gen_random_uuid(),
        ${name},
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        NOW() + interval '2 hours'
      )
      RETURNING id, name
    `);

    return result.rows[0];
  }

  async findNearby(
    lat: number,
    lng: number,
  ) {
    const result = await db.execute(sql`
      SELECT
        id,
        name,
        ROUND(
          ST_Distance(
            location,
            ST_MakePoint(${lng}, ${lat})::geography
          )
        ) AS distance_in_meters
      FROM rooms
      WHERE expires_at > NOW()
        AND ST_DWithin(
          location,
          ST_MakePoint(${lng}, ${lat})::geography,
          5000
        )
      ORDER BY distance_in_meters ASC
    `);

    return result.rows;
  }
}
