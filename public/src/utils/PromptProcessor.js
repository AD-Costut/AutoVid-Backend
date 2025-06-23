function generatePrompt(selectedVideoType, input) {
  let finalPrompt = "";
  if (selectedVideoType === "Quiz") {
    finalPrompt = `Make 3 questions multiple choice quiz script about: "${input}".

        Write the entire quiz script inside a single pair of ## delimiters.
        
        The quiz script should start with something like:
        Welcome to today's quiz about the topic.
        
        Then write exactly 3 questions and answers in this format:
        ##
        [1. Short Question 1 text]  
        [A. ]  
        [B. ]  
        [C. ]  
        Correct Answear [ .]  
        
        [2. Short Question 2 text]  
        [A. ]  
        [B. ]  
        [C. ]  
        Correct Answear [ .]  
        
        ...  
        
        [3. Short Question 3 text]  
        [A. ]  
        [B. ]  
        [C. ]  
        Correct Answear [ .]  
        ##
        4500 characters max
        Do NOT include any narrator labels, parentheses, comments, or extra delimiters.`;
  } else if (selectedVideoType === "Slide Show") {
    finalPrompt = `Make a YouTube slideshow narration script about: "${input}" for a youtube video.
      
      Then write the entire narration script inside a single pair of ## delimiters.
      
      Write only the narration text to be spoken throughout the slideshow.
      
      Do NOT include slide notes, timestamps, multiple #%# delimiters, parentheses, or narrator labels.
      
      Example output format:
      
      ##
      [Pure narration script here...]
      ##
      1500 characters max`;
  } else if (selectedVideoType === "Reddit Story") {
    finalPrompt = `Create a Reddit-style story script based on: "${input}" for a YouTube video.

      Write the entire story script inside a single pair of ## delimiters.
      
      Write the story as pure text, without any narrator labels, parentheses, stage directions, or commentary.
      
      Example output format:
      
      ##
      [Story text here...]
      ##
      4500 characters max`;
  } else {
    throw new Error("Invalid video type provided.");
  }

  return finalPrompt;
}

module.exports = {
  generatePrompt,
};
