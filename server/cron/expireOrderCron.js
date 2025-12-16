// cron/expireOrdersCron.js
export function createExpireOrdersCron({
  cronService,
  intervalMin,
  logger = console,
}) {
  let timer = null;
  let running = false;
  const intervalMs = intervalMin * 1000 * 60;

  async function tick() {
    if (running) return; // evita solaparse si tarda más que interval
    running = true;

    try {
      const result = await cronService.runOnce();
      if (result?.processed != null) {
        logger.log(`🕒 cron: processed=${result.processed} extended=${result.extended} paid=${result.paid} released=${result.released}`);
      }
    } catch (e) {
      logger.error("🧯 cron: error", e);
    } finally {
      running = false;
    }
  }

  return {
    start() {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
      // opcional: correr 1 vez al iniciar
      tick().catch(() => {});
      logger.log(`⏱️ cron: started every ${intervalMs}ms`);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      logger.log("🛑 cron: stopped");
    },
  };
}
