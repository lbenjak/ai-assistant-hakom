export let assistantId = "asst_vASzpEJZWPHXUfRYfqYjcHcw"; // set your assistant ID here

if (assistantId === "") {
  assistantId = process.env.OPENAI_ASSISTANT_ID;
}
