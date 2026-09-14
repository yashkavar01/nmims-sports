import { NextResponse } from "next/server";
import db from "../../../lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const teamId = body.teamId?.trim();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role?.trim() || "PLAYER";

    if (!teamId || !name || !email) {
      return NextResponse.json(
        {
          error: "Team, name and email are required.",
        },
        { status: 400 }
      );
    }

    if (!["PLAYER", "CAPTAIN"].includes(role)) {
      return NextResponse.json(
        {
          error: "Invalid team member role.",
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

    let user = await db.orm.public.User
      .where({ email })
      .first();

    if (!user) {
      user = await db.orm.public.User.create({
        name,
        email,
        role: "STUDENT",
      });
    }

    const existingMember = await db.orm.public.TeamMember
      .where({
        teamId,
        userId: user.id,
      })
      .first();

    if (existingMember) {
      return NextResponse.json(
        {
          error: "This user is already a member of the team.",
        },
        { status: 409 }
      );
    }

    if (role === "CAPTAIN") {
      const existingCaptain = await db.orm.public.TeamMember
        .where({
          teamId,
          role: "CAPTAIN",
        })
        .first();

      if (existingCaptain) {
        return NextResponse.json(
          {
            error: "This team already has a captain.",
          },
          { status: 409 }
        );
      }
    }

    const member = await db.orm.public.TeamMember.create({
      teamId,
      userId: user.id,
      role,
    });

    return NextResponse.json(
      {
        member,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to add team member.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          error: "Member ID is required.",
        },
        { status: 400 }
      );
    }

    const member = await db.orm.public.TeamMember
      .where({ id })
      .first();

    if (!member) {
      return NextResponse.json(
        {
          error: "Team member does not exist.",
        },
        { status: 404 }
      );
    }

    await db.orm.public.TeamMember
      .where({ id })
      .delete();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to remove team member.",
      },
      { status: 500 }
    );
  }
}