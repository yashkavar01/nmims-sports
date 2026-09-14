import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const sportId = body.sportId?.trim();

    if (!name || !sportId) {
      return NextResponse.json(
        {
          error: "Team name and sport are required.",
        },
        { status: 400 }
      );
    }

    const sport = await db.orm.public.Sport
      .where({ id: sportId })
      .first();

    if (!sport) {
      return NextResponse.json(
        {
          error: "Selected sport does not exist.",
        },
        { status: 404 }
      );
    }

    const existingTeam = await db.orm.public.Team
      .where({
        name,
        sportId,
      })
      .first();

    if (existingTeam) {
      return NextResponse.json(
        {
          error: "A team with this name already exists for this sport.",
        },
        { status: 409 }
      );
    }

    /*
     * TEMPORARY DEVELOPMENT USER
     *
     * Authentication is not implemented yet.
     * This user will be replaced by the authenticated
     * student's ID when Auth.js is added.
     */
    const developmentEmail = "dev.student@nmims.local";

    let developmentUser = await db.orm.public.User
      .where({
        email: developmentEmail,
      })
      .first();

    if (!developmentUser) {
      developmentUser = await db.orm.public.User.create({
        name: "Development Student",
        email: developmentEmail,
        role: "STUDENT",
      });
    }

    const team = await db.orm.public.Team.create({
      name,
      sportId,
      createdById: developmentUser.id,
    });

    return NextResponse.json(
      {
        team,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create team.",
      },
      { status: 500 }
    );
  }
}