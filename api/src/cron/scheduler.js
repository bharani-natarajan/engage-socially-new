import { prisma } from '../prisma.js';

/**
 * Normalizes a search post from Unipile to a consistent format.
 */
function normalizeSearchPost(post) {
  const author = post.author ?? post.actor ?? {};
  return {
    id: post.social_id ?? post.id ?? '',
    text: post.text ?? '',
    author: {
      name: author.name ?? author.full_name ?? 'LinkedIn Member',
      headline: author.headline ?? '',
      profile_url: author.public_identifier
        ? `https://www.linkedin.com/in/${author.public_identifier}`
        : null,
      avatar_url: author.profile_picture_url ?? null,
    },
    share_url: post.share_url ?? post.url ?? null,
    reaction_count: post.reaction_count ?? post.reaction_counter ?? 0,
    comment_count: post.comment_count ?? post.comment_counter ?? 0,
    timestamp: post.date ?? post.created_at ?? null,
    media_url: post.attachments?.[0]?.url ?? null,
  };
}

/**
 * Calculates a random scheduled time between 9 AM and 9 PM IST (UTC+5:30).
 * If the current time is already past 9 PM IST, it schedules for tomorrow.
 * Otherwise, it schedules for a random time today between the current time (+ 5 mins) and 9 PM IST.
 */
export function getScheduledTimeInIST() {
  const now = new Date();
  
  // IST offset is +5.5 hours (330 minutes)
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(now.getTime() + istOffsetMs);
  
  const currentYear = nowIST.getUTCFullYear();
  const currentMonth = nowIST.getUTCMonth();
  const currentDay = nowIST.getUTCDate();
  const currentHour = nowIST.getUTCHours();
  const currentMinute = nowIST.getUTCMinutes();

  let targetDateIST;
  
  const currentMinutesSinceMidnight = currentHour * 60 + currentMinute;
  const endMinutesSinceMidnight = 21 * 60; // 9:00 PM IST = 1260 minutes
  
  // We want to schedule at least 5 minutes in the future to allow processing
  const minScheduledMinutes = currentMinutesSinceMidnight + 5;

  if (currentHour >= 21 || minScheduledMinutes >= endMinutesSinceMidnight) {
    // Past 9 PM IST (or less than 5 minutes remaining today). Schedule for tomorrow.
    const tomorrowIST = new Date(Date.UTC(currentYear, currentMonth, currentDay + 1));
    const randomHour = 9 + Math.floor(Math.random() * 12); // 9 to 20 (9 AM to 8:59 PM)
    const randomMinute = Math.floor(Math.random() * 60);
    tomorrowIST.setUTCHours(randomHour, randomMinute, 0, 0);
    targetDateIST = tomorrowIST;
  } else {
    // There is still time left today!
    let targetHour, targetMinute;
    
    if (currentHour < 9) {
      // It is before 9 AM today. Choose any random time between 9 AM and 9 PM today.
      targetHour = 9 + Math.floor(Math.random() * 12); // 9 to 20
      targetMinute = Math.floor(Math.random() * 60);
    } else {
      // It is between 9 AM and 9 PM today.
      // Pick a random minute between minScheduledMinutes and endMinutesSinceMidnight.
      const range = endMinutesSinceMidnight - minScheduledMinutes;
      const randomOffset = Math.floor(Math.random() * range);
      const scheduledMinutes = minScheduledMinutes + randomOffset;
      
      targetHour = Math.floor(scheduledMinutes / 60);
      targetMinute = scheduledMinutes % 60;
    }
    
    targetDateIST = new Date(Date.UTC(currentYear, currentMonth, currentDay, targetHour, targetMinute, 0, 0));
  }

  // Convert the IST date back to UTC for saving in the database
  const targetUTC = new Date(targetDateIST.getTime() - istOffsetMs);
  return targetUTC;
}

async function autoResolveUnipileAccount(userId, unipileBaseUrl, unipileApiKey) {
  try {
    const url = `${unipileBaseUrl}/accounts`;
    const response = await fetch(url, {
      headers: {
        'X-API-KEY': unipileApiKey,
        'Accept': 'application/json'
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    const accounts = data.items ?? data.data ?? data;
    if (Array.isArray(accounts) && accounts.length > 0) {
      const activeAcc = accounts.find(a => a.sources?.some(s => s.status === 'OK')) || accounts[0];
      if (activeAcc && userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { unipileAccountId: activeAcc.id }
        });
        console.log(`[Auto-Resolve] Saved Unipile account ID ${activeAcc.id} to user ID ${userId}`);
      }
      return activeAcc?.id || null;
    }
  } catch (err) {
    console.error('[Auto-Resolve] Failed to auto-resolve Unipile account:', err.message);
  }
  return null;
}

const activeRuns = new Set();

export async function runSchedulerJob(workflowId = null, options = {}) {
  if (workflowId) {
    if (activeRuns.has(workflowId)) {
      console.log(`[Scheduler Cron] Workflow ${workflowId} is already running. Skipping concurrent run.`);
      return;
    }
    activeRuns.add(workflowId);
  }

  console.log(`[Scheduler Cron] Starting check. targetWorkflowId=${workflowId ?? 'ALL'}`);
  
  const unipileDsn = process.env.UNIPILE_DSN ?? '';
  const unipileApiKey = process.env.UNIPILE_API_KEY ?? '';
  const geminiApiKey = process.env.GEMINI_API_KEY ?? '';

  if (!unipileApiKey) {
    console.error('[Scheduler Cron Error] UNIPILE_API_KEY is not configured.');
    if (workflowId) activeRuns.delete(workflowId);
    return;
  }
  if (!geminiApiKey) {
    console.error('[Scheduler Cron Error] GEMINI_API_KEY is not configured.');
    if (workflowId) activeRuns.delete(workflowId);
    return;
  }

  const dsnBase = unipileDsn.startsWith('http') ? unipileDsn : `https://${unipileDsn}`;
  const unipileBaseUrl = `${dsnBase}/api/v1`;

  try {
    // 1. Fetch workflows to process
    let workflows = [];
    if (workflowId) {
      const wf = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { user: true }
      });
      if (wf) workflows.push(wf);
    } else {
      // In serverless/production, we only process the workflow that hasn't been run for the longest time to prevent Vercel timeouts.
      // This rotates through workflows one-by-one on subsequent cron requests.
      const oldestWorkflow = await prisma.workflow.findFirst({
        orderBy: [
          { lastRunAt: 'asc' },
          { createdAt: 'asc' }
        ],
        include: { user: true }
      });
      if (oldestWorkflow) workflows.push(oldestWorkflow);
    }

    if (workflows.length === 0) {
      console.log('[Scheduler Cron] No workflows found to run.');
      return;
    }

    console.log(`[Scheduler Cron] Processing ${workflows.length} workflow(s)...`);

    for (const workflow of workflows) {
      try {
        console.log(`[Scheduler Cron] Running workflow "${workflow.name}" (${workflow.id})`);
        
        let accountId = workflow.user?.unipileAccountId || workflow.userId; // userId stores the unipile account_id

        // Self-heal: If account ID looks like a database user UUID (e.g. 36 chars with hyphens), auto-resolve it
        const isDbUuid = accountId && accountId.includes('-') && accountId.length === 36;
        if (!accountId || isDbUuid) {
          console.log(`[Scheduler Cron] Account ID "${accountId}" is invalid or a database UUID. Attempting to resolve a valid Unipile account ID...`);
          const resolvedId = await autoResolveUnipileAccount(workflow.user?.id, unipileBaseUrl, unipileApiKey);
          if (resolvedId) {
            accountId = resolvedId;
          }
        }

        const searchKeyword = workflow.type === 'creator' ? workflow.creatorName : workflow.keyword;

        if (!searchKeyword?.trim()) {
          console.log(`[Scheduler Cron] Workflow ${workflow.id} has no keyword or creator name. Skipping.`);
          continue;
        }

        // 2. Search LinkedIn posts via Unipile
        console.log(`[Scheduler Cron] Searching LinkedIn posts for "${searchKeyword}" using account ${accountId}...`);
        let searchResponse = await fetch(`${unipileBaseUrl}/linkedin/search?account_id=${encodeURIComponent(accountId)}`, {
          method: 'POST',
          headers: {
            'X-API-KEY': unipileApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            api: 'classic',
            category: 'posts',
            keywords: searchKeyword.trim(),
            date_posted: 'past_week'
          })
        });

        // Self-heal: If Unipile says account not found (404), retry auto-resolving and search again
        if (searchResponse.status === 404 || !searchResponse.ok) {
          const errorData = await searchResponse.text();
          if (errorData.includes('Account not found') || searchResponse.status === 404) {
            console.log(`[Scheduler Cron] Unipile search failed with 404 / Account not found. Retrying auto-resolve...`);
            const resolvedId = await autoResolveUnipileAccount(workflow.user?.id, unipileBaseUrl, unipileApiKey);
            if (resolvedId && resolvedId !== accountId) {
              accountId = resolvedId;
              console.log(`[Scheduler Cron] Retrying Unipile search using resolved account ${accountId}...`);
              searchResponse = await fetch(`${unipileBaseUrl}/linkedin/search?account_id=${encodeURIComponent(accountId)}`, {
                method: 'POST',
                headers: {
                  'X-API-KEY': unipileApiKey,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  api: 'classic',
                  category: 'posts',
                  keywords: searchKeyword.trim(),
                  date_posted: 'past_week'
                })
              });
              if (!searchResponse.ok) {
                const retryErrorData = await searchResponse.text();
                throw new Error(`Unipile search failed on retry: ${retryErrorData}`);
              }
            } else {
              throw new Error(`Unipile search failed: ${errorData}`);
            }
          } else {
            throw new Error(`Unipile search failed: ${errorData}`);
          }
        }

        const searchResult = await searchResponse.json();
        const rawPosts = searchResult.items ?? searchResult.data ?? searchResult.posts ?? [];
        const posts = rawPosts
          .map(normalizeSearchPost)
          .filter(p => p.id && !p.id.startsWith('urn:li:groupPost'))
          .sort((a, b) => {
            const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return timeB - timeA;
          });

        console.log(`[Scheduler Cron] Found ${posts.length} raw search results (sorted newest first).`);

        // 3. Filter posts based on existing comments & limits
        const existingComments = await prisma.workflowComment.findMany({
          where: { workflowId: workflow.id },
          select: { postId: true }
        });
        const existingPostIds = new Set(existingComments.map(c => c.postId));

        let filteredPosts = [];

        if (workflow.type === 'creator') {
          const slug = workflow.creatorIdentifier;
          let matchedPosts = posts.filter(p =>
            p.author?.profile_url?.toLowerCase().includes(slug.toLowerCase())
          );

          // Enforce 1 post per day limit for creator workflows
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const alreadyToday = await prisma.workflowComment.findFirst({
            where: {
              workflowId: workflow.id,
              status: { in: ['posted', 'approved', 'scheduled', 'posting'] },
              createdAt: { gte: today }
            }
          });

          if (alreadyToday) {
            console.log(`[Scheduler Cron] Workflow ${workflow.id} already has a comment scheduled or posted today. Skipping creator.`);
            matchedPosts = [];
          } else {
            matchedPosts = matchedPosts.filter(p => !existingPostIds.has(p.id)).slice(0, 1);
          }
          filteredPosts = matchedPosts;
        } else {
          // Keyword workflows: count current active comments and limit by commentsPerDay
          const activeCount = await prisma.workflowComment.count({
            where: {
              workflowId: workflow.id,
              status: { in: ['pending', 'approved', 'scheduled', 'posting'] }
            }
          });
          const remaining = Math.max(0, (workflow.commentsPerDay ?? 20) - activeCount);
          filteredPosts = posts.filter(p => !existingPostIds.has(p.id)).slice(0, remaining);
        }

        if (filteredPosts.length === 0) {
          console.log(`[Scheduler Cron] No new posts to comment on for workflow ${workflow.id}.`);
          continue;
        }

        console.log(`[Scheduler Cron] Generating ${filteredPosts.length} comment(s) for workflow ${workflow.id}...`);

        // 4. Generate comments in parallel
        console.log(`[Scheduler Cron] Generating up to ${filteredPosts.length} comments in parallel for workflow ${workflow.id}...`);
        
        const generationPromises = filteredPosts.map(async (post) => {
          try {
            console.log(`[Scheduler Cron] Generating AI comment for post ${post.id} by ${post.author?.name}...`);
            
            const toneInstructions = {
              friendly: 'Write in a warm, approachable, and conversational tone.',
              professional: 'Write in a polished, professional, and brand-appropriate tone.',
              casual: 'Write in a relaxed, informal, and relatable tone.',
              witty: 'Write in a light-hearted tone with a touch of humour.',
            };

            const lengthInstructions = {
              short: 'Write a very short, punchy comment (1 brief sentence or phrase, under 15 words).',
              medium: 'Write a medium-sized comment (1-2 sentences).',
              long: 'Write a detailed, insightful comment (3-4 sentences, adding value or asking a relevant question).',
            };

            const brandContext = options.brandContext ?? '';
            const tone = options.tone ?? 'professional';
            const avoid = options.avoid ?? '';

            const parts = [];
            if (brandContext.trim()) parts.push(`Brand / business context:\n${brandContext.trim()}`);
            parts.push(`LinkedIn post by ${post.author?.name ?? 'someone'}:\n"${post.text.trim().slice(0, 600)}"`);
            parts.push(toneInstructions[tone] ?? toneInstructions.professional);
            if (avoid.trim()) parts.push(`Important — do NOT include: ${avoid.trim()}`);

            const lenInstr = lengthInstructions[workflow.commentLength] ?? lengthInstructions.medium;
            parts.push(`Write a thoughtful LinkedIn comment on this post. ${lenInstr} No hashtags. Return only the comment text, nothing else.`);

            const promptText = parts.join('\n\n');

            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
              })
            });

            if (!geminiRes.ok) {
              const geminiErr = await geminiRes.text();
              throw new Error(`Gemini API failed: ${geminiErr}`);
            }

            const geminiData = await geminiRes.json();
            const commentText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (!commentText) {
              throw new Error('Gemini returned an empty comment suggestion.');
            }

            // Determine status and scheduled time
            const status = workflow.autoPost ? 'scheduled' : 'pending';
            const scheduledAt = workflow.autoPost ? getScheduledTimeInIST() : null;

            // Double check if workflow still exists before creating comment
            const wfExists = await prisma.workflow.findUnique({
              where: { id: workflow.id },
              select: { id: true }
            });
            if (!wfExists) {
              console.log(`[Scheduler Cron] Workflow ${workflow.id} was deleted during generation. Skipping comment creation.`);
              return false;
            }

            // Create comment in DB
            await prisma.workflowComment.create({
              data: {
                workflowId: workflow.id,
                postId: post.id,
                postText: post.text?.slice(0, 220) ?? '',
                postAuthor: post.author?.name ?? 'LinkedIn Member',
                postAuthorHeadline: post.author?.headline ?? '',
                postUrl: post.share_url ?? null,
                commentText: commentText,
                status: status,
                scheduledAt: scheduledAt
              }
            });

            console.log(`[Scheduler Cron] Created comment for post ${post.id}. Status=${status}, scheduledAt=${scheduledAt}`);
            return true;
          } catch (itemErr) {
            console.error(`[Scheduler Cron] Failed for post ${post.id}:`, itemErr.message);
            return false;
          }
        });

        const results = await Promise.all(generationPromises);
        const newCommentsCount = results.filter(Boolean).length;

        // 5. Update workflow lastRunAt and count of generated comments
        if (newCommentsCount > 0) {
          await prisma.workflow.update({
            where: { id: workflow.id },
            data: {
              lastRunAt: new Date(),
              commentsGenerated: { increment: newCommentsCount }
            }
          });
        }

      } catch (wfErr) {
        console.error(`[Scheduler Cron] Error processing workflow ${workflow.id}:`, wfErr);
      }
    }
  } catch (err) {
    console.error('[Scheduler Cron Error]', err);
  } finally {
    if (workflowId) {
      activeRuns.delete(workflowId);
    }
  }
}
