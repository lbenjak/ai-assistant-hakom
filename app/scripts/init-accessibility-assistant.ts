import { OpenAI } from "openai";

const openai = new OpenAI();

async function main() {
  try {
    const assistant = await openai.beta.assistants.create({
      name: "Accessibility Assistant",
      instructions: `You are an accessibility assistant that helps users with accessibility settings.
You analyze user input to determine if it contains accessibility-related requests.
You should detect requests related to:
- Font size changes (increase, decrease, reset)
- Font type changes (dyslexic font, standard font)
- Theme changes (dark theme, light theme)
- General accessibility queries

When analyzing text, return:
- intentType: The type of accessibility request (FONT_SIZE, FONT_TYPE, THEME, GENERAL_QUERY, NOT_ACCESSIBILITY)
- action: The specific action requested (INCREASE, DECREASE, RESET, SET)
- value: Additional value for the action (e.g., "dark" for theme)
- confidence: How confident you are that this is an accessibility request (0.0 to 1.0)`,
      model: "gpt-4-turbo-preview",
      tools: [{
        type: "function",
        function: {
          name: "analyze_accessibility_intent",
          description: "Analyze if the user's input contains an accessibility-related request",
          parameters: {
            type: "object",
            properties: {
              intentType: {
                type: "string",
                enum: ["FONT_SIZE", "FONT_TYPE", "THEME", "GENERAL_QUERY", "NOT_ACCESSIBILITY"],
                description: "The type of accessibility request detected"
              },
              action: {
                type: "string",
                enum: ["INCREASE", "DECREASE", "RESET", "SET"],
                description: "The specific action requested"
              },
              value: {
                type: "string",
                description: "Additional value for the action (e.g., 'dark' for theme)"
              },
              confidence: {
                type: "number",
                description: "Confidence score for the detection (0.0 to 1.0)"
              }
            },
            required: ["intentType", "confidence"]
          }
        }
      }]
    });

    console.log("Assistant created successfully!");
    console.log("Assistant ID:", assistant.id);
    console.log("\nAdd this ID to your .env file as ACCESSIBILITY_ASSISTANT_ID");
  } catch (error) {
    console.error("Error creating assistant:", error);
  }
}

main(); 