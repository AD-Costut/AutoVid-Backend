function generatePrompt(selectedVideoType, message) {
  let finalPrompt = "";

  if (selectedVideoType === "Quiz") {
    finalPrompt = `Make a quiz script about: "${message}" for a YouTube video.
  
  Start with a clear title for the quiz enclosed in &^& markers, like this:
  &&[Title]&&
  
  Then write the entire quiz script inside a single pair of ## delimiters.
  
  First, read the input and extract the main idea or topic in a short phrase or few words.
  
  The quiz script should start with:
  Welcome to today's 2 quizzez about [main idea extracted from the input]. 
  
  &&[Clear Quiz Title]&&
  
  Then write exactly 2 questions and answers in this format:
  ##
  [Short Question1 text]
  [Short Answer1 text]
  
  [Short Question2 text]
  [Short Answer2 text]
  ##
  300 characters max
  Do NOT include any narrator labels, parentheses, comments, or extra delimiters.`;
  } else if (selectedVideoType === "Slide Show") {
    finalPrompt = `Make a YouTube slideshow narration script about: "${message}" for a youtube video.
  
  Start with a clear title enclosed in && markers, like this:
  &&[Title]&&
  
  Then write the entire narration script inside a single pair of ## delimiters.
  
  Write only the narration text to be spoken throughout the slideshow.
  
  Do NOT include slide notes, timestamps, multiple #%# delimiters, parentheses, or narrator labels.
  
  Example output format:
  
  &&[Clear Title]&&
  ##
  [Pure narration script here...]
  ##
  300 characters max`;
  } else if (selectedVideoType === "Reddit Story") {
    finalPrompt = `Create a Reddit-style story script based on: "${message}" for a YouTube video.
  
  Start with a clear and engaging story title enclosed in && markers, like this:
  &&[Story Title]&&
  
  Then write the entire story script inside a single pair of ## delimiters.
  
  Write the story as pure text, without any narrator labels, parentheses, stage directions, or commentary.
  
  Example output format:
  
  &&[Story Title]&&
  ##
  [Story text here...]
  ##
  300 characters max`;
  } else {
    throw new Error("Invalid video type provided.");
  }

  return finalPrompt;
}

module.exports = {
  generatePrompt,
};
