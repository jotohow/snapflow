import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIProvider {
  generateResume(prompt: string, model?: string): Promise<string>;
  getAvailableModels(): string[];
}

export class OpenAIProvider implements AIProvider {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  /**
   * Generate a resume using the AI model
   */
  async generateResume(
    prompt: string,
    model: string = 'gpt-4.1-mini'
  ): Promise<string> {
    try {
      const response = await this.sendToModel(model, prompt);
      const outputs = this.parseResponse(response);

      return this.extractFinalResume(outputs);
    } catch (error) {
      console.error('❌ AI generation failed:', error);
      throw new Error(`AI generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get list of available models
   */
  getAvailableModels(): string[] {
    return [
      'gpt-4',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-5',
    ];
  }

  // TODO: Should be using the chat API
  /**
   * Send prompt to the AI model
   */
  private async sendToModel(
    model: string,
    input: string
  ): Promise<OpenAI.Chat.ChatCompletion> {
    try {
      const response = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'user',
            content: input,
          },
        ],
        max_tokens: 1024,
      });
      return response;
    } catch (error) {
      console.error('❌ OpenAI API call failed:', error);
      throw error;
    }
  }

  /**
   * Parse the AI model response
   */
  private parseResponse(response: OpenAI.Chat.ChatCompletion): string[] {
    try {
      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('❌ No content in response');
        throw new Error('No content in response from AI model');
      }
      return [content];
    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
      throw new Error(
        `Failed to parse AI response: ${(error as Error).message}`
      );
    }
  }

  /**
   * Extract the final resume from AI output
   */
  private extractFinalResume(outputs: string[]): string {
    if (!outputs || outputs.length === 0) {
      throw new Error('No output received from AI model');
    }

    try {
      // Try to parse as JSON first
      const obj = JSON.parse(outputs[0]);
      if (obj.final_resume) {
        return obj.final_resume;
      }
      // If no final_resume field, return the first output as-is
      return outputs[0];
    } catch (error) {
      // If parsing fails, treat as plain string
      console.log('AI response is not JSON, treating as plain text');
      return outputs[0];
    }
  }
}

/**
 * Mock AI provider for testing
 */
export class MockAIProvider implements AIProvider {
  async generateResume(prompt: string, model?: string): Promise<string> {
    console.log(
      '🤖 Mock AI Provider - Prompt received:',
      prompt.substring(0, 100) + '...'
    );

    // Return a mock response for testing
    return `Recent Work: You were working on [mock response from ${model || 'default'}]

What you were doing:
• [mock task 1]
• [mock task 2]

Next Steps:
• [mock next action]
• [mock follow-up]

Context: [mock branch and commit info]`;
  }

  getAvailableModels(): string[] {
    return ['mock-model'];
  }
}
