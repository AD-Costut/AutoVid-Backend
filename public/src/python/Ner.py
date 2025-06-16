import spacy
import sys
import json

nlp = spacy.load("en_core_web_sm")

text = sys.argv[1]
doc = nlp(text)

entities = []
for ent in doc.ents:
    if ent.label_ in ["ORG", "PERSON", "GPE", "PRODUCT", "EVENT"]:
        entities.append(ent.text)

if not entities:
    from collections import Counter
    words = [token.text.lower() for token in doc if token.pos_ == "NOUN" and len(token.text) > 3]
    counts = Counter(words)
    if counts:
        entities = [counts.most_common(1)[0][0]]

print(json.dumps(entities))
