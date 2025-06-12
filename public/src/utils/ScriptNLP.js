const nlp = require("compromise");

function analyzeEntitiesFromAiResponse(message) {
  const doc = nlp(message);
  const terms = doc.terms().json();

  const orderedEntities = [];

  terms.forEach((termObj) => {
    const term = termObj.text;
    const tags = termObj.tags || [];

    if (tags.includes("Person")) {
      orderedEntities.push({ type: "person", value: term });
    } else if (tags.includes("Organization")) {
      orderedEntities.push({ type: "organization", value: term });
    } else if (tags.includes("Place")) {
      orderedEntities.push({ type: "place", value: term });
    } else if (tags.includes("Date")) {
      orderedEntities.push({ type: "date", value: term });
    } else if (tags.includes("Animal")) {
      orderedEntities.push({ type: "animal", value: term });
    } else if (tags.includes("Fruit")) {
      orderedEntities.push({ type: "fruit", value: term });
    }
  });

  return {
    text: message,
    orderedEntities,
  };
}

module.exports = {
  analyzeEntitiesFromAiResponse,
};
