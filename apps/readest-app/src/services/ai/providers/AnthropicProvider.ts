import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModel } from 'ai';
import type { AIProvider, AISettings, AIProviderName } from '../types';
import { aiLogger } from '../logger';
import { ANTHROPIC_MODELS } from '../constants';
import { AI_TIMEOUTS } from '../utils/retry';
import { getAIFetch } from '../utils/httpFetch';

const BASE_URL = 'https://api.anthropic.com/v1';
const API_VERSION = '2023-06-01';

/**
 * Direct Claude provider using the user's own Anthropic API key.
 *
 * Claude has no embeddings API, so this provider has no embedding model:
 * book indexing stores chunks for keyword (BM25) search only.
 */
export class AnthropicProvider implements AIProvider {
  id: AIProviderName = 'anthropic';
  name = 'Claude (Anthropic)';
  requiresAuth = true;

  private settings: AISettings;
  private apiKey: string;
  private httpFetch: typeof fetch;
  private client: ReturnType<typeof createAnthropic>;

  constructor(settings: AISettings) {
    if (!settings.anthropicApiKey) {
      throw new Error('Anthropic API key required');
    }
    this.settings = settings;
    this.apiKey = settings.anthropicApiKey;
    this.httpFetch = getAIFetch();
    this.client = createAnthropic({
      apiKey: this.apiKey,
      // Required by the API for requests from a browser (web build). The
      // Tauri app sends requests from Rust, where the header is harmless.
      headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
      fetch: this.httpFetch,
    });
    aiLogger.provider.init('anthropic', this.modelId());
  }

  private modelId(): string {
    return this.settings.anthropicModel || ANTHROPIC_MODELS.OPUS;
  }

  getModel(): LanguageModel {
    return this.client(this.modelId());
  }

  getEmbeddingModel(): null {
    return null;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Listing models validates the key without spending tokens.
      const response = await this.httpFetch(`${BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        signal: AbortSignal.timeout(AI_TIMEOUTS.HEALTH_CHECK),
      });
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return true;
    } catch (e) {
      aiLogger.provider.error('anthropic', `healthCheck failed: ${(e as Error).message}`);
      return false;
    }
  }
}
