const nlp = require("compromise");
const { sendMessageToAi } = require("./ScriptEditor");

async function analyzeEntitiesFromAiResponse(message) {
  const aiResponse = await sendMessageToAi(message);

  const doc = nlp(aiResponse);

  const people = doc.people().out("array");
  const organizations = doc.organizations().out("array");
  const places = doc.places().out("array");
  const dates = doc.dates().out("array");
  const animals = doc.match("#Animal").out("array");
  const fruits = doc.match("#Fruit").out("array");

  return {
    text: aiResponse,
    people,
    organizations,
    places,
    dates,
    animals,
    fruits,
  };
}

module.exports = {
  analyzeEntitiesFromAiResponse,
};
