import type { OpenTextExercise } from '@/content/types';
import { getOpenAIClient } from '@/lib/openai';

export type OpenTextGradeResult = {
  isCorrect: boolean;
  feedback: string;
};

export async function gradeOpenText(
  exercise: OpenTextExercise,
  studentText: string
): Promise<OpenTextGradeResult | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  const trimmed = studentText.trim();
  if (!trimmed) {
    return { isCorrect: false, feedback: 'Відповідь порожня.' };
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You grade Polish-language homework for Ukrainian students at Werba Way.
Decide if the student's answer adequately addresses the prompt in Polish.
Be lenient with minor grammar or spelling mistakes when the meaning is clear.
The sampleAnswer is only a reference — other valid answers count as correct.
Reply ONLY with JSON: {"correct": boolean, "feedback": "1-2 short sentences in Ukrainian for the student"}`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: exercise.prompt,
            sampleAnswer: exercise.sampleAnswer ?? null,
            studentAnswer: trimmed,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { correct?: boolean; feedback?: string };
    return {
      isCorrect: Boolean(parsed.correct),
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback.trim() : '',
    };
  } catch {
    return null;
  }
}
