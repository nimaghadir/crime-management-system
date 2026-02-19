def pluralize(word: str) -> str:
    if not word:
        return word

    lower_word = word.lower()
    if lower_word.endswith(("s", "x", "z", "ch", "sh")):
        return f"{word}es"
    if lower_word.endswith("y") and len(word) > 1 and lower_word[-2] not in "aeiou":
        return f"{word[:-1]}ies"
    return f"{word}s"
