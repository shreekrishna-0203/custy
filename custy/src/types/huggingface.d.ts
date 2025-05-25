declare module '@huggingface/inference' {
    export class InferenceClient {
      constructor(token: string);
      chat: {
        completions: {
          create(params: {
            model: string;
            messages: Array<{
              role: string;
              content: string;
            }>;
          }): Promise<{
            choices: Array<{
              message: {
                content: string;
              };
            }>;
          }>;
        };
      };
    }
  }