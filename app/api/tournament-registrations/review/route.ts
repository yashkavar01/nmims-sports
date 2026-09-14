import { Temporal } from "temporal-polyfill/full";
import { NextResponse } from "next/server";
import db from "../../../../lib/db";

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const registrationId = body.registrationId?.trim();
    const status = body.status?.trim().toUpperCase();

    if (!registrationId || !status) {
      return NextResponse.json(
        {
          error: "Registration ID and status are required.",
        },
        { status: 400 }
      );
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        {
          error: "Status must be APPROVED or REJECTED.",
        },
        { status: 400 }
      );
    }

    const registration =
      await db.orm.public.TournamentRegistrationRequest
        .where({ id: registrationId })
        .first();

    if (!registration) {
      return NextResponse.json(
        {
          error: "Registration request does not exist.",
        },
        { status: 404 }
      );
    }

    if (registration.status !== "PENDING") {
      return NextResponse.json(
        {
          error: `This registration has already been ${registration.status.toLowerCase()}.`,
        },
        { status: 409 }
      );
    }

    const updatedRegistration =
      await db.orm.public.TournamentRegistrationRequest
        .where({ id: registrationId })
        .update({
          status,
          reviewedAt: Temporal.Now.instant(),
        });

    if (status === "APPROVED") {
      const existingTournamentTeam =
        await db.orm.public.TournamentTeam
          .where({
            tournamentId: registration.tournamentId,
            teamId: registration.teamId,
          })
          .first();

      if (!existingTournamentTeam) {
        await db.orm.public.TournamentTeam.create({
          tournamentId: registration.tournamentId,
          teamId: registration.teamId,
        });
      }
    }

    return NextResponse.json({
      registration: updatedRegistration,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Failed to review registration.",
      },
      { status: 500 }
    );
  }
}