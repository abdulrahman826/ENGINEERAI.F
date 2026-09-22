"use client";

import { useState } from "react";
import type { Question, AnswerEntry } from "@/lib/types";

interface QuestionFormProps {
  questions: Question[];
  onSubmit: (answers: AnswerEntry[]) => void;
  loading?: boolean;
}

export function QuestionForm({ questions, onSubmit, loading }: QuestionFormProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const setAnswer = (i: number, value: string) =>
    setAnswers((a) => ({ ...a, [i]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: AnswerEntry[] = questions.map((q, i) => ({
      question: q.text,
      answer: answers[i] ?? "",
    }));
    onSubmit(payload);
  };

  const allAnswered = questions.every((_, i) => Boolean(answers[i]));

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {questions.map((q, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <p className="text-sm font-medium text-text-primary mb-3">
            {i + 1}. {q.text}
          </p>
          {q.question_type === "multiple_choice" && q.options ? (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`q-${i}`}
                    value={opt}
                    checked={answers[i] === opt}
                    onChange={() => setAnswer(i, opt)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-text-primary">{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[i] ?? ""}
              onChange={(e) => setAnswer(i, e.target.value)}
              rows={2}
              placeholder="Describe what you observe…"
              className="w-full rounded-input border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-primary focus:outline-none resize-none"
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={!allAnswered || loading}
        className="w-full rounded-button bg-primary py-3 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
      >
        {loading ? "Analyzing…" : "Submit Answers"}
      </button>
    </form>
  );
}
