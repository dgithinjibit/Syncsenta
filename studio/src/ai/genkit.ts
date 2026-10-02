
import {genkit} from 'genkit';
import {openAICompatible} from '@genkit-ai/compat-oai';
import {googleAI} from '@genkit-ai/googleai';

/**
 * Provider: the ASI gateway (SingularityNET's OpenAI-compatible endpoint).
 *
 * Why not Google AI directly: production never had GEMINI_API_KEY on the
 * Vercel project, which made all 18 Co-Pilot tools 500 identically
 * (recorded in docs/ROADMAP.md, spoon 12c). The ASI key arrives from the
 * BASIX organizers as ASI_CLOUD_KEY, so it is the credential that actually
 * exists. compat-oai speaks the OpenAI wire format against ASI's
 * /v1/chat/completions.
 *
 * The googleAI plugin stays registered but is NOT the default: only
 * Gemini-specific capabilities use it (Mwalimu's TTS voice replies), and
 * they degrade gracefully when no Gemini key is present.
 */
export const ASI_BASE_URL = 'https://llm.c.singularitynet.io/v1';
export const ASI_MODEL = 'asi/asi1-mini';

export const ai = genkit({
  plugins: [
    openAICompatible({
      name: 'asi',
      apiKey: process.env.ASI_CLOUD_KEY,
      baseURL: ASI_BASE_URL,
    }),
    googleAI({apiKey: process.env.GEMINI_API_KEY}),
  ],
  model: ASI_MODEL,
});
