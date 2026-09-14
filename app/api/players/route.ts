import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = body.userId?.trim();
    const teamId = body.teamId?.trim();
    const jerseyNo =
      body.jerseyNo === "" || body.jerseyNo == null
        ? null
        : Number(body.jerseyNo);

    if (!userId || !teamId) {
      return NextResponse.json(
        {
          error: "Team member and team are required.",
        },
        { status: 400 }
      );
    }

    if (
      jerseyNo !== null &&
      (!Number.isInteger(jerseyNo) || jerseyNo < 0)
    ) {
      return NextResponse.json(
        {
          error: "Jersey number must be a valid positive number.",
        },
        { status: 400 }
      );
    }

    const team = await db.orm.public.Team
      .where({ id: teamId })
      .first();

    if (!team) {
      return NextResponse.json(
        {
          error: "Team does not exist.",
        },
        { status: 404 }
      );
    }

    const user = await db.orm.public.User
      .where({ id: userId })
      .first();

    if (!user) {
      return NextResponse.json(
        {
          error: "User does not exist.",
        },
        { status: 404 }
      );
    }

    const members = await db.orm.public.TeamMember
      .where({ teamId })
      .all();

    const isMember = members.some(
      (member) => member.userId === userId
    );

    if (!isMember) {
      return NextResponse.json(
        {
          error: "This user is not a member of the selected team.",
        },
        { status: 400 }
      );
    }

    const existingPlayers = await db.orm.public.Player.all();

    const alreadyPlayer = existingPlayers.some(
      (player) =>
        player.userId === userId &&
        player.teamId === teamId
    );

    if (alreadyPlayer) {
      return NextResponse.json(
        {
          error: "This team member is already registered as a player.",
        },
        { status: 409 }
      );
    }

    if (jerseyNo !== null) {
      const jerseyAlreadyUsed = existingPlayers.some(
        (player) =>
          player.teamId === teamId &&
          player.jerseyNo === jerseyNo
      );

      if (jerseyAlreadyUsed) {
        return NextResponse.json(
          {
            error: "This jersey number is already used by this team.",
          },
          { status: 409 }
        );
      }
    }

    const player = await db.orm.public.Player.create({
      userId,
      teamId,
      jerseyNo,
    });

    return NextResponse.json(
      {
        player,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to create player.",
      },
      { status: 500 }
    );
  }
}