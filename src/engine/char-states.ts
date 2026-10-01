import type { CharState } from "@/types";

import { toCharacters } from "./text";
import type { EngineWordState, TestState } from "./types";

/** Return rendering states for every target and extra character in one word. */
export function getWordCharStates(word: EngineWordState): readonly CharState[] {
  const target = toCharacters(word.target);
  const typed = toCharacters(word.typed);
  const states: CharState[] = target.map((character, index) => {
    const typedCharacter = typed[index];
    if (typedCharacter === undefined)
      return word.submitted ? "missed" : "untyped";
    return typedCharacter === character ? "correct" : "incorrect";
  });

  for (let index = target.length; index < typed.length; index += 1)
    states.push("extra");
  return states;
}

/** Return character states for every word in a test. */
export function getCharStates(
  state: TestState,
): readonly (readonly CharState[])[] {
  return state.words.map(getWordCharStates);
}
