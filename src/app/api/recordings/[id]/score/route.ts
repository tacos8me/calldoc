// ─── /api/recordings/[id]/score ──────────────────────────────────────────────
// GET: Get scorecard for recording
// POST: Submit score

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  scorecardResponses,
  scorecardTemplates,
  recordings,
  users,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requirePermission } from '@/lib/auth/middleware';
import { uuidSchema, parseBody, notFoundResponse, serverErrorResponse } from '@/lib/api/validation';

const submitScoreSchema = z.object({
  templateId: z.string().uuid(),
  scores: z.array(
    z.object({
      questionId: z.string(),
      score: z.number().nullable(),
      comment: z.string().nullable().default(null),
    })
  ),
  overallScore: z.number().int().min(0),
  maxPossibleScore: z.number().int().min(1),
  comments: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('recordings:view');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  try {
    const [recording] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');

    const scorecards = await db
      .select({
        id: scorecardResponses.id,
        recordingId: scorecardResponses.recordingId,
        templateId: scorecardResponses.templateId,
        templateName: scorecardTemplates.name,
        evaluatorId: scorecardResponses.evaluatorId,
        evaluatorName: users.name,
        scoresJson: scorecardResponses.scoresJson,
        overallScore: scorecardResponses.overallScore,
        maxPossibleScore: scorecardResponses.maxPossibleScore,
        scorePercentage: scorecardResponses.scorePercentage,
        comments: scorecardResponses.comments,
        completedAt: scorecardResponses.completedAt,
        createdAt: scorecardResponses.createdAt,
      })
      .from(scorecardResponses)
      .leftJoin(scorecardTemplates, eq(scorecardResponses.templateId, scorecardTemplates.id))
      .leftJoin(users, eq(scorecardResponses.evaluatorId, users.id))
      .where(eq(scorecardResponses.recordingId, params.id));

    return NextResponse.json({
      data: scorecards.map((s) => ({
        id: s.id,
        recordingId: s.recordingId,
        templateId: s.templateId,
        templateName: s.templateName ?? 'Unknown',
        evaluatorId: s.evaluatorId,
        evaluatorName: s.evaluatorName ?? 'Unknown',
        scores: s.scoresJson,
        overallScore: s.overallScore,
        maxPossibleScore: s.maxPossibleScore,
        scorePercentage: s.scorePercentage,
        comments: s.comments,
        completedAt: s.completedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('GET /api/recordings/[id]/score error:', error);
    return serverErrorResponse('Failed to fetch scorecard');
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requirePermission('recordings:score');
  if (!auth.authorized) return auth.response;

  const idResult = uuidSchema.safeParse(params.id);
  if (!idResult.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid recording ID format' } },
      { status: 400 }
    );
  }

  const parsed = await parseBody(request, submitScoreSchema);
  if (!parsed.success) return parsed.response;

  try {
    const [recording] = await db
      .select({ id: recordings.id })
      .from(recordings)
      .where(eq(recordings.id, params.id))
      .limit(1);

    if (!recording) return notFoundResponse('Recording');

    // Verify template exists
    const [template] = await db
      .select({ id: scorecardTemplates.id })
      .from(scorecardTemplates)
      .where(eq(scorecardTemplates.id, parsed.data.templateId))
      .limit(1);

    if (!template) return notFoundResponse('Scorecard template');

    const scorePercentage = Math.round(
      (parsed.data.overallScore / parsed.data.maxPossibleScore) * 100
    );

    const [response] = await db
      .insert(scorecardResponses)
      .values({
        recordingId: params.id,
        templateId: parsed.data.templateId,
        evaluatorId: auth.user.userId,
        scoresJson: parsed.data.scores,
        overallScore: parsed.data.overallScore,
        maxPossibleScore: parsed.data.maxPossibleScore,
        scorePercentage,
        comments: parsed.data.comments ?? null,
        completedAt: new Date(),
      })
      .returning();

    // Update recording's hasScorecard and overallScore
    await db
      .update(recordings)
      .set({
        hasScorecard: true,
        overallScore: scorePercentage,
      })
      .where(eq(recordings.id, params.id));

    return NextResponse.json(
      {
        data: {
          id: response.id,
          recordingId: response.recordingId,
          templateId: response.templateId,
          evaluatorId: response.evaluatorId,
          scores: response.scoresJson,
          overallScore: response.overallScore,
          maxPossibleScore: response.maxPossibleScore,
          scorePercentage: response.scorePercentage,
          comments: response.comments,
          completedAt: response.completedAt?.toISOString() ?? null,
          createdAt: response.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/recordings/[id]/score error:', error);
    return serverErrorResponse('Failed to submit scorecard');
  }
}
