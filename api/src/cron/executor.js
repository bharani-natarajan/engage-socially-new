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
      include: {
        workflow: true
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
      const accountId = comment.workflow.userId; // userId stores the unipile account_id
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

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || JSON.stringify(data) || `Unipile responded with status ${response.status}`);
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

        // 4. Mark as failed on error
        await prisma.workflowComment.update({
          where: { id: comment.id },
          data: {
            status: 'failed',
            errorMessage: postError.message
          }
        });
      }
    }
  } catch (err) {
    console.error('[Executor Cron Error]', err);
  }
}
