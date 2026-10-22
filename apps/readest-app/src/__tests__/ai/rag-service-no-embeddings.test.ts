import { describe, test, expect, vi, beforeEach } from 'vitest';

// A provider without an embedding model (Claude has no embeddings API).
vi.mock('@/services/ai/providers', () => ({
  getAIProvider: vi.fn(() => ({ getEmbeddingModel: () => null })),
}));

vi.mock('ai', () => ({
  embed: vi.fn(async () => ({ embedding: [0] })),
  embedMany: vi.fn(async () => ({ embeddings: [[0]] })),
}));

vi.mock('@/services/ai/storage/aiStore', () => ({
  aiStore: {
    isIndexed: vi.fn(async () => false),
    saveChunks: vi.fn(async () => undefined),
    saveBM25Index: vi.fn(async () => undefined),
    saveMeta: vi.fn(async () => undefined),
    hybridSearch: vi.fn(async () => []),
  },
}));

vi.mock('@/services/ai/utils/chunker', () => ({
  extractTextFromDocument: vi.fn(() => 'x'.repeat(200)),
  chunkSection: vi.fn(() => [
    {
      id: 'c1',
      bookHash: 'book',
      sectionIndex: 0,
      chapterTitle: 'Chapter 1',
      text: 'Habits are the compound interest of self-improvement.',
      pageNumber: 1,
    },
  ]),
}));

import { embed, embedMany } from 'ai';
import { aiStore } from '@/services/ai/storage/aiStore';
import { hybridSearch, indexBook } from '@/services/ai/ragService';
import { DEFAULT_AI_SETTINGS } from '@/services/ai/constants';

const bookDoc = {
  sections: [
    {
      id: 's1',
      size: 200,
      linear: 'yes',
      createDocument: async () => document.implementation.createHTMLDocument(),
    },
  ],
  metadata: { title: 'Atomic Habits' },
};

describe('ragService with a provider that has no embedding model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('indexBook saves chunks and the BM25 index without embedding them', async () => {
    await indexBook(bookDoc, 'book', DEFAULT_AI_SETTINGS);

    expect(embedMany).not.toHaveBeenCalled();
    expect(aiStore.saveChunks).toHaveBeenCalledTimes(1);
    expect(aiStore.saveBM25Index).toHaveBeenCalledTimes(1);
    expect(aiStore.saveMeta).toHaveBeenCalledWith(
      expect.objectContaining({ bookHash: 'book', totalChunks: 1 }),
    );
  });

  test('hybridSearch uses keyword search only', async () => {
    await hybridSearch('book', 'compound interest', DEFAULT_AI_SETTINGS, 5);

    expect(embed).not.toHaveBeenCalled();
    expect(aiStore.hybridSearch).toHaveBeenCalledWith(
      'book',
      null,
      'compound interest',
      5,
      undefined,
    );
  });
});
