"use client";

import { memo } from "react";
import type { RefCallback } from "react";

import { getWordCharStates } from "@/engine";
import type { EngineWordState } from "@/engine";
import { cn } from "@/lib/cn";

export interface TypingWordProps {
  word: EngineWordState;
  active: boolean;
  caretAnchorRef: RefCallback<HTMLSpanElement>;
}

const stateClasses = {
  untyped: "text-muted",
  correct: "text-foreground",
  incorrect: "text-incorrect",
  extra:
    "rounded-sm bg-incorrect/15 text-incorrect line-through decoration-incorrect/70",
  missed:
    "text-muted underline decoration-incorrect decoration-2 underline-offset-4",
} as const;

function CaretAnchor({
  caretAnchorRef,
}: Pick<TypingWordProps, "caretAnchorRef">) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[1.25em] w-0 align-[-0.22em]"
      data-caret-anchor
      data-testid="caret-anchor"
      ref={caretAnchorRef}
    />
  );
}

function TypingWordComponent({
  word,
  active,
  caretAnchorRef,
}: TypingWordProps) {
  const targetCharacters = Array.from(word.target);
  const typedCharacters = Array.from(word.typed);
  const charStates = getWordCharStates(word);
  const extras = typedCharacters.slice(targetCharacters.length);
  const incorrectSubmission = word.submitted && word.typed !== word.target;

  return (
    <span
      className={cn(
        "mr-[0.58em] inline-block rounded-sm whitespace-nowrap",
        incorrectSubmission && "border-b border-dotted border-incorrect",
      )}
      data-active={active ? "true" : "false"}
      data-target={word.target}
      data-testid="typing-word"
    >
      {targetCharacters.map((character, index) => (
        <span key={`${character}-${index}`}>
          {active && typedCharacters.length === index ? (
            <CaretAnchor caretAnchorRef={caretAnchorRef} />
          ) : null}
          <span
            className={stateClasses[charStates[index] ?? "untyped"]}
            data-active-character={
              active && typedCharacters.length <= index ? "true" : undefined
            }
          >
            {character}
          </span>
        </span>
      ))}
      {extras.map((character, index) => (
        <span
          className={stateClasses.extra}
          key={`extra-${character}-${index}`}
        >
          {character}
        </span>
      ))}
      {active && typedCharacters.length >= targetCharacters.length ? (
        <CaretAnchor caretAnchorRef={caretAnchorRef} />
      ) : null}
    </span>
  );
}

/**
 * Unchanged word objects retain identity in the engine. This comparator means a
 * keystroke re-renders only the edited word plus a word whose active flag changed.
 */
export const TypingWord = memo(
  TypingWordComponent,
  (previous, next) =>
    previous.word === next.word &&
    previous.active === next.active &&
    previous.caretAnchorRef === next.caretAnchorRef,
);
