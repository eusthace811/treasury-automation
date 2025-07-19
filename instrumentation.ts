// import { registerOTel } from '@vercel/otel';

export async function register() {
  // registerOTel({ serviceName: 'treasury-automation' });

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { Laminar } = await import('@lmnr-ai/lmnr');

    // Make sure to initialize Laminar **after** you initialize other
    // tracing libraries, e.g. `registerOTel` from `@vercel/otel`.
    Laminar.initialize({
      projectApiKey: process.env.LMNR_PROJECT_API_KEY,
    });
  }
}
