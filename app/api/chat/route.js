import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from 'openai';
//import {HfInference} from '@huggingface/inference'

const systemPrompt = `
You are a rate my professor agent to help students find classes, that takes in user questions and answers them.
For every user question, if the question has specific words that maps to one professor, return only that professor, else the top 3 professors that match the user question are returned.
Use them to answer the question if needed.
`

export async function POST(req) {
  const data = await req.json()
  
  const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

const index = pc.index('rag').namespace('ns1')
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const text_model = genAI.getGenerativeModel({model:'text-embedding-004'})
//const hf = new HfInference(process.env.HF_TOKEN)

const text = data[data.length - 1].content

// const embedding = await hf.featureExtraction({
//   model: 'sentence-transformers/all-MiniLM-L6-v2',
//   input: text,
//   encoding_format: 'float',
// })

const Result = await text_model.embedContent(text);
const embeddings = Result.embedding;

const results = await index.query({
  topK: 5,
  includeMetadata: true,
  vector: embeddings['values'],
})

let resultString = ''
results.matches.forEach((match) => {
  resultString += `\n
  Returned Results:
  Professor: ${match.id}
  Review: ${match.metadata.stars}
  Subject: ${match.metadata.subject}
  Stars: ${match.metadata.stars}
  \n\n`
})

const lastMessage = data[data.length - 1]
const lastMessageContent = lastMessage.content + resultString
const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: "meta-llama/llama-3.1-8b-instruct:free",
  messages: [
    { role: "user", content: systemPrompt },
    ...lastDataWithoutLastMessage,
    { role: "user", content: lastMessageContent },
  ],
  stream: true,
});

try{

const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    try {
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          const text = encoder.encode(content);
          controller.enqueue(text);
        }
      }
    } catch (error) {
      controller.error(error);
    } finally {
      controller.close();
    }
  },
});

return new NextResponse(stream);


/*const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
})

const completion = await model.generateContentStream({
  contents: [
    { role: 'model', parts: [{ text: systemPrompt }] },
    ...lastDataWithoutLastMessage.map(msg => ({ role: 'user', parts: [{ text: msg.content }] })),
    { role: 'user', parts: [{ text: lastMessageContent }] },
  ],
});

try{

const readableStream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder()
    try {
      for await (const chunk of completion.stream) {
          const chunkText = chunk.content.parts[0].text;
          controller.enqueue(encoder.encode(chunkText));
        }
    } catch (err) {
      controller.error(err)
    } finally {
      controller.close()
    }
  },
})
return new NextResponse(readableStream, {
  headers: { "Content-Type": "text/event-stream" }
})*/

} catch (e) {
  console.error(e);
  return NextResponse.json({ text: "error, check console" });
}

}

/*export async function POST(req) {
  const data = await req.json()
  
  const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})
const index = pc.index('rag').namespace('ns1')
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
hf_embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

const text = data[data.length - 1].content
const embedding = await hf_embeddings.create({
  model: 'sentence-transformers/all-MiniLM-L6-v2',
  input: text,
  encoding_format: 'float',
})

try{

const results = await index.query({
  topK: 5,
  includeMetadata: true,
  vector: embedding.data[0].embedding,
})

let resultString = ''
results.matches.forEach((match) => {
  resultString += `
  Returned Results:
  Professor: ${match.id}
  Review: ${match.metadata.stars}
  Subject: ${match.metadata.subject}
  Stars: ${match.metadata.stars}
  \n\n`
})

const lastMessage = data[data.length - 1]
const lastMessageContent = lastMessage.content + resultString
const lastDataWithoutLastMessage = data.slice(0, data.length - 1)

const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  systemInstruction: systemPrompt,
})

const completion = await model.generateContent({
  contents: [
    {role: 'system', content: systemPrompt},
    ...lastDataWithoutLastMessage,
    {role: 'user', content: lastMessageContent},
  ],
  stream: true,
});*/
