import { prisma } from '../prisma.js';

export async function runExecutorJob() {
  console.log('[Executor Cron] Running scheduled comments execution check...');
  try {
    const now = new Date();
    // Due if scheduledAt is in the past, or up to 17 minutes in the future
    const maxScheduledTime = new Date(now.getTime() + 17 * 60 * 1000);

    const commentsToPost = await prisma.workflowComment.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: maxScheduledTime,
          not: null
        }
      },
      take: 5, // Process at most 5 comments per run to prevent Vercel execution timeouts
      include: {
        workflow: {
          include: {
            user: true
          }
        }
      }
    });

    if (commentsToPost.length === 0) return;

    console.log(`[Executor Cron] Found ${commentsToPost.length} scheduled comments due for posting.`);

    const unipileDsn = process.env.UNIPILE_DSN ?? '';
    const unipileApiKey = process.env.UNIPILE_API_KEY ?? '';
    const dsnBase = unipileDsn.startsWith('http') ? unipileDsn : `https://${unipileDsn}`;
    const unipileBaseUrl = `${dsnBase}/api/v1`;

    for (const comment of commentsToPost) {
      // 1. Atomic status update to prevent duplicates across multiple processes
      const updateResult = await prisma.workflowComment.updateMany({
        where: {
          id: comment.id,
          status: 'scheduled'
        },
        data: {
          status: 'posting'
        }
      });

      if (updateResult.count === 0) {
        console.log(`[Executor Cron] Comment ${comment.id} already picked up by another worker. Skipping.`);
        continue;
      }

      // 2. Perform the LinkedIn posting via Unipile
      const accountId = comment.workflow.user?.unipileAccountId || comment.workflow.userId; // userId stores the unipile account_id
      const postId = comment.postId;
      const message = comment.commentText;

      try {
        console.log(`[Executor Cron] Posting comment ${comment.id} to LinkedIn post ${postId} using account ${accountId}...`);
        
        const response = await fetch(`${unipileBaseUrl}/posts/${encodeURIComponent(postId)}/comments`, {
          method: 'POST',
          headers: {
            'X-API-KEY': unipileApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            account_id: accountId,
            text: message
          })
        });

        let data = {};
        try {
          data = await response.json();
        } catch (jsonErr) {
          // Response might not be JSON (e.g. gateway timeout or proxy errors)
        }

        if (!response.ok) {
          const errMsg = data.message || data.error || JSON.stringify(data) || `Unipile responded with status ${response.status}`;
          const err = new Error(errMsg);
          err.status = response.status;
          throw err;
        }

        // 3. Mark as posted on success
        await prisma.workflowComment.update({
          where: { id: comment.id },
          data: {
            status: 'posted',
            postedAt: new Date(),
            errorMessage: null
          }
        });

        console.log(`[Executor Cron] Successfully posted comment ${comment.id}.`);
      } catch (postError) {
        console.error(`[Executor Cron] Failed to post comment ${comment.id}:`, postError.message);

        // Check if error is transient/retryable (network issue or server error / rate limit)
        const isNetworkError = postError.message.includes('fetch failed') || !postError.status;
        const isTemporaryServerError = postError.status === 429 || postError.status >= 500;
        const shouldRetry = isNetworkError || isTemporaryServerError;

        if (shouldRetry) {
          let retryCount = 0;
          if (comment.errorMessage && comment.errorMessage.startsWith('[Retry ')) {
            const match = comment.errorMessage.match(/\[Retry (\d+)\/3\]/);
            if (match) {
              retryCount = parseInt(match[1], 10);
            }
          }

          if (retryCount < 3) {
            const nextRetry = retryCount + 1;
            const delayMinutes = nextRetry * 5; // Backoff: 5m, 10m, 15m
            const nextRun = new Date(Date.now() + delayMinutes * 60 * 1000);
            
            console.log(`[Executor Cron] Comment ${comment.id} failed due to a transient issue. Rescheduling for retry ${nextRetry}/3 at ${nextRun.toISOString()}.`);
            
            await prisma.workflowComment.update({
              where: { id: comment.id },
              data: {
                status: 'scheduled',
                scheduledAt: nextRun,
                errorMessage: `[Retry ${nextRetry}/3] ${postError.message}`
              }
            });
            continue;
          }
        }

        // 4. Mark as failed permanently on max retries or non-retryable error (e.g. 404)
        const errorPrefix = shouldRetry ? `[Failed after 3 retries] ` : '';
        await prisma.workflowComment.update({
          where: { id: comment.id },
          data: {
            status: 'failed',
            errorMessage: `${errorPrefix}${postError.message}`
          }
        });
      }
    }
  } catch (err) {
    console.error('[Executor Cron Error]', err);
  }
}
