import { openai } from "@/app/openai";
import { accessibilityAssistantId } from "@/app/accessibility-config";

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!accessibilityAssistantId) {
      console.error('Accessibility Assistant ID is not configured');
      return Response.json({ error: 'Accessibility Assistant ID is not configured' }, { status: 500 });
    }

    // Create a thread for this analysis
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);
    
    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: text
    });
    console.log('Message added to thread');
    
    // Run the analysis
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: accessibilityAssistantId,
      tools: [{
        type: "function",
        function: {
          name: "analyze_accessibility_intent"
        }
      }]
    });
    console.log('Analysis run started:', run.id);
    
    // Wait for the analysis to complete
    let analysisResult;
    let attempts = 0;
    const maxAttempts = 60; // Increased max attempts but with shorter interval
    
    while (attempts < maxAttempts) {
      attempts++;
      const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Run status:', runStatus.status);
      
      if (runStatus.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(thread.id);
        const lastMessage = messages.data[0];
        console.log('Response message:', JSON.stringify(lastMessage, null, 2));
        
        if (lastMessage.role === 'assistant') {
          if (lastMessage.content[0].type === 'function_call') {
            analysisResult = JSON.parse(lastMessage.content[0].function_call.arguments);
          } else if (lastMessage.content[0].type === 'text') {
            analysisResult = {
              intentType: "NOT_ACCESSIBILITY",
              confidence: 1.0
            };
          }
          console.log('Analysis result:', analysisResult);
        }
        break;
      }
      
      if (runStatus.status === 'requires_action') {
        console.log('Run requires action:', JSON.stringify(runStatus.required_action, null, 2));
        
        // Get the assistant's function call arguments
        const toolCall = runStatus.required_action.submit_tool_outputs.tool_calls[0];
        if (toolCall.type === 'function' && toolCall.function.name === 'analyze_accessibility_intent') {
          try {
            // Handle empty arguments case
            const args = toolCall.function.arguments;
            analysisResult = args && args !== '{}' ? 
              JSON.parse(args) : 
              { intentType: "NOT_ACCESSIBILITY", confidence: 1.0 };
          
            // Submit the result back
            await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
              tool_outputs: [{
                tool_call_id: toolCall.id,
                output: JSON.stringify(analysisResult)
              }]
            });
          
            console.log('Submitted tool outputs with analysis result:', analysisResult);
            break;
          } catch (error) {
            console.error('Error parsing function arguments:', error);
            analysisResult = { intentType: "NOT_ACCESSIBILITY", confidence: 1.0 };
            break;
          }
        }
      }
      
      if (runStatus.status === 'failed') {
        console.error('Run failed:', runStatus);
        throw new Error('Analysis failed');
      }
      
      if (runStatus.status === 'expired') {
        console.error('Run expired:', runStatus);
        throw new Error('Analysis expired');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Clean up the thread
    await openai.beta.threads.del(thread.id);
    console.log('Thread cleaned up');
    
    if (!analysisResult) {
      return Response.json({ 
        intentType: "NOT_ACCESSIBILITY", 
        confidence: 1.0 
      });
    }
    
    return Response.json(analysisResult);
  } catch (error) {
    console.error('Error in accessibility analysis:', error);
    return Response.json({ 
      intentType: "NOT_ACCESSIBILITY", 
      confidence: 1.0,
      error: error.message 
    });
  }
} 