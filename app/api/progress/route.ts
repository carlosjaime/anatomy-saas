import { STUDY_EVENT_KINDS, type StudyEventKind } from "../../../db/schema";
import { organById, type OrganId } from "../../lib/anatomy-data";
import { HttpError, assertSameOrigin, handle, json, readJson, requireUser } from "../../lib/server/http";
import { recordStudyEvent } from "../../lib/server/progress-store";

function isOrganId(value: unknown): value is OrganId {
  return typeof value === "string" && Object.hasOwn(organById, value);
}

function isKind(value: unknown): value is StudyEventKind {
  return typeof value === "string" && (STUDY_EVENT_KINDS as readonly string[]).includes(value);
}

export const POST = handle(async (request) => {
  assertSameOrigin(request);
  const body = await readJson(request);
  if (!isOrganId(body.organId) || !isKind(body.kind)) throw new HttpError(422, "Evento de estudio no válido.");
  if (body.kind === "quiz" && typeof body.correct !== "boolean") throw new HttpError(422, "Falta el resultado del cuestionario.");

  const { db, user } = await requireUser(request);
  const recorded = await recordStudyEvent(db, user.id, {
    organId: body.organId,
    kind: body.kind,
    correct: body.correct === true,
  });
  return json({ recorded }, { status: recorded ? 201 : 200 });
});
