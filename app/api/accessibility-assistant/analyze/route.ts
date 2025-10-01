import { openai } from "@/app/openai";
import { accessibilityAssistantId } from "@/app/accessibility-config";
import { LOGGING_ENABLED } from "@/app/utils/logging";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!accessibilityAssistantId) {
      if (LOGGING_ENABLED) { console.error('Accessibility Assistant ID is not configured'); }
      return Response.json({ error: 'Accessibility Assistant ID is not configured' }, { status: 500 });
    }

    // Create a thread for this analysis
    const thread = await openai.beta.threads.create();
    if (LOGGING_ENABLED) { console.log('Thread created:', thread.id); }
    
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: text
    });
    if (LOGGING_ENABLED) { console.log('Message added to thread'); }
    
    // Run the analysis
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: accessibilityAssistantId,
      tools: [{
        type: "function",
        function: {
          name: "analyze_accessibility_intent",
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
                description: "The action to perform"
              },
              value: {
                type: "string",
                description: "Additional value for the action (e.g., 'dark' for theme, 'dyslexic' for font type)"
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Confidence score of the intent detection"
              }
            },
            required: ["intentType", "confidence"]
          }
        }
      }]
    });
    if (LOGGING_ENABLED) { console.log('Analysis run started:', { runId: run.id, threadId: thread.id }); }
    
    // Wait for the analysis to complete
    let analysisResult;
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      attempts++;
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (LOGGING_ENABLED) { console.log('Run status check #' + attempts + ':', { 
        status: runStatus.status,
        threadId: thread.id,
        runId: run.id
      }); }
      
      if (runStatus.status === 'requires_action') {
        if (LOGGING_ENABLED) { console.log('Run requires action:', {
          threadId: thread.id,
          runId: run.id,
          action: JSON.stringify(runStatus.required_action, null, 2)
        }); }
        
        // Check if there are multiple tool calls
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        if (toolCalls.length > 1) {
          if (LOGGING_ENABLED) { console.log('Multiple intents detected, returning GENERAL_QUERY'); }
          analysisResult = {
            intentType: "GENERAL_QUERY",
            confidence: 0.6
          };
          
          // Submit success response for all tool calls
          await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
            tool_outputs: toolCalls.map(call => ({
              tool_call_id: call.id,
              output: JSON.stringify({ success: true })
            }))
          });
          
          break;
        }
        
        // Handle single tool call
        const toolCall = toolCalls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'analyze_accessibility_intent') {
          try {
            const args = toolCall.function.arguments;
            if (LOGGING_ENABLED) { console.log('Raw function arguments:', args); }
            
            let parsedArgs;
            try {
              parsedArgs = JSON.parse(args);
              if (LOGGING_ENABLED) { console.log('Parsed arguments:', parsedArgs); }
            } catch (parseError) {
              if (LOGGING_ENABLED) { console.error('Error parsing arguments:', parseError); }
              parsedArgs = {};
            }
            
            analysisResult = Object.keys(parsedArgs).length > 0 ? 
              parsedArgs : 
              { intentType: "NOT_ACCESSIBILITY", confidence: 1.0 };
            
            if (LOGGING_ENABLED) { console.log('Determined analysis result:', analysisResult); }
            
            await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
              tool_outputs: [{
                tool_call_id: toolCall.id,
                output: JSON.stringify({ success: true })
              }]
            });
            
            if (LOGGING_ENABLED) { console.log('Successfully submitted tool outputs'); }
            break;
          } catch (error) {
            if (LOGGING_ENABLED) { console.error('Error processing function arguments:', {
              error: error.message,
              args: toolCall.function.arguments
            }); }
            analysisResult = { intentType: "NOT_ACCESSIBILITY", confidence: 1.0 };
            break;
          }
        }
      }
      
      if (runStatus.status === 'completed') {
        if (!analysisResult) {
          const messages = await openai.beta.threads.messages.list(thread.id);
          const lastMessage = messages.data[0];
          if (LOGGING_ENABLED) { console.log('Complete response message:', {
            role: lastMessage.role,
            contentType: lastMessage.content[0]?.type,
            content: JSON.stringify(lastMessage.content, null, 2)
          }); }
        }
        break;
      }
      
      if (runStatus.status === 'failed') {
        if (LOGGING_ENABLED) { console.error('Run failed:', {
          threadId: thread.id,
          runId: run.id,
          status: runStatus
        }); }
        throw new Error('Analysis failed');
      }
      
      if (runStatus.status === 'expired') {
        if (LOGGING_ENABLED) { console.error('Run expired:', {
          threadId: thread.id,
          runId: run.id,
          status: runStatus
        }); }
        throw new Error('Analysis expired');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clean up the thread
    await openai.beta.threads.del(thread.id);
    if (LOGGING_ENABLED) { console.log('Thread cleaned up:', thread.id); }
    
    if (!analysisResult) {
      if (LOGGING_ENABLED) { console.log('No analysis result obtained, returning default'); }
      return Response.json({ 
        intentType: "NOT_ACCESSIBILITY", 
        confidence: 1.0 
      });
    }
    
    if (LOGGING_ENABLED) { console.log('Returning final result:', analysisResult); }
    return Response.json(analysisResult);
  } catch (error) {
    if (LOGGING_ENABLED) { console.error('Error in accessibility analysis:', {
      error: error.message,
      stack: error.stack
    }); }
    return Response.json({ 
      intentType: "NOT_ACCESSIBILITY", 
      confidence: 1.0,
      error: error.message 
    });
  }
} 