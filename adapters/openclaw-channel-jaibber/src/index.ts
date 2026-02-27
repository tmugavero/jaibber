import { jaibberChannel, setGlobals } from "./channel.js";

/**
 * OpenClaw plugin entry point.
 * Called by the OpenClaw gateway when loading this extension.
 */
export default function register(api: {
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void; error: (...args: unknown[]) => void };
  config: Record<string, unknown>;
  gateway: { onInboundMessage: (...args: unknown[]) => void };
  registerChannel: (opts: { plugin: typeof jaibberChannel }) => void;
}) {
  api.logger.info("[jaibber] Jaibber channel plugin loading...");

  // Wire up globals so the channel can access config, gateway, and logger
  setGlobals(
    api.config,
    api.gateway.onInboundMessage as Parameters<typeof setGlobals>[1],
    api.logger,
  );

  api.registerChannel({ plugin: jaibberChannel });

  api.logger.info("[jaibber] Jaibber channel registered. Waiting for account start.");
}
