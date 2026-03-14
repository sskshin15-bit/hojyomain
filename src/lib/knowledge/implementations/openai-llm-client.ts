/**
 * OpenAI AI SDK による LlmClientAdapter 実装
 * Structured Outputs 強制、Exponential Backoff
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateObject, generateText } from "ai"
import type { z } from "zod"
import type { LlmClientAdapter, StructuredLlmOptions, PromptCacheConfig } from "../adapters/llm-client"

const DEFAULT_MODEL = "gpt-4o-mini"

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 1000
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }
  throw lastErr
}

export class OpenAILlmClient implements LlmClientAdapter {
  async generateObject<T extends z.ZodType>(
    modelId: string,
    prompt: string,
    options: StructuredLlmOptions<T>
  ): Promise<z.infer<T>> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured")
    const openai = createOpenAI({ apiKey })
    const model = modelId || DEFAULT_MODEL

    const doGenerate = async () => {
      const { object } = await generateObject({
        model: openai(model),
        schema: options.schema,
        system: options.system,
        prompt,
      })
      return object as z.infer<T>
    }

    return withRetry(doGenerate, options.maxRetries ?? 2)
  }

  async generateText(
    modelId: string,
    prompt: string,
    options?: { system?: string; promptCache?: PromptCacheConfig; maxRetries?: number }
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured")
    const openai = createOpenAI({ apiKey })
    const model = modelId || DEFAULT_MODEL

    const doGenerate = async () => {
      const { text } = await generateText({
        model: openai(model),
        system: options?.system,
        prompt,
      })
      return text
    }

    return withRetry(doGenerate, options?.maxRetries ?? 2)
  }
}
