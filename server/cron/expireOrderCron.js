// cron/expireOrdersCron.js
import { v4 as uuidv4 } from "uuid";
import { logger } from "../utils/logger.js";

export function createExpireOrdersCron({
  cronService,
  intervalMin,
}) {
  const log = logger.child({ job: "expire-orders-cron" });

  const intervalMs = Math.max(1, Number(intervalMin || 1)) * 60_000;

  let timer = null;
  let running = false;
  let stopped = true;

  async function tick() {
    if (stopped) return;

    if (running) {
      log.debug("[CRON] cron tick skipped (already running)");
      scheduleNext();
      return;
    }

    running = true;

    const runId = uuidv4();
    const tlog = log.child({ runId });
    const startedAt = Date.now();

    try {
      tlog.info({ intervalMs }, "[CRON] cron tick start");

      const result = await cronService.runOnce();

      if (result?.processed != null) {
        tlog.info(
          {
            durationMs: Date.now() - startedAt,
            stats: {
              processed: result.processed,
              extended: result.extended,
              paid: result.paid,
              released: result.released,
            },
          },
          "[CRON] cron tick done"
        );
      } else {
        tlog.info(
          { durationMs: Date.now() - startedAt },
          "[CRON] cron tick done (no stats)"
        );
      }
    } catch (err) {
      tlog.error(
        { err, durationMs: Date.now() - startedAt },
        "[CRON] cron tick failed"
      );
    } finally {
      running = false;
      scheduleNext();
    }
  }

  function scheduleNext() {
    if (stopped) return;
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      tick().catch(() => {});
    }, intervalMs);
  }

  return {
    start({ runImmediately = true } = {}) {
      if (!stopped) return;

      stopped = false;

      log.info(
        { intervalMs, runImmediately },
        "[CRON] cron started"
      );

      if (runImmediately) {
        tick().catch(() => {});
      } else {
        scheduleNext();
      }
    },

    stop() {
      stopped = true;

      if (timer) clearTimeout(timer);
      timer = null;

      log.info({ running }, "[CRON] cron stopped");
    }
  };
}
